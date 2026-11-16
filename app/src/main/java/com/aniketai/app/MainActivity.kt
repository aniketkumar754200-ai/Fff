package com.aniketai.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.speech.RecognizerIntent
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.aniketai.app.databinding.ActivityMainBinding
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private var pendingWebPermissionRequest: PermissionRequest? = null
    private var pendingSpeechLocale: String? = null
    private var hasMainFrameError = false

    private val audioPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        val webReq = pendingWebPermissionRequest
        pendingWebPermissionRequest = null
        if (webReq != null) {
            if (granted) {
                webReq.grant(webReq.resources)
            } else {
                webReq.deny()
            }
        }

        val locale = pendingSpeechLocale
        pendingSpeechLocale = null
        if (locale != null) {
            if (granted) {
                launchAndroidSpeechRecognizer(locale)
            } else {
                Toast.makeText(
                    this,
                    getString(R.string.mic_permission_denied),
                    Toast.LENGTH_SHORT
                ).show()
                dispatchSpeechError(getString(R.string.mic_permission_denied))
            }
        }
    }

    private val speechRecognizerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val matches = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            val spokenText = matches?.firstOrNull()?.trim().orEmpty()
            if (spokenText.isNotEmpty()) {
                val escaped = JSONObject.quote(spokenText)
                binding.webView.post {
                    binding.webView.evaluateJavascript(
                        "window.__onAniketAndroidSpeechResult && window.__onAniketAndroidSpeechResult($escaped);",
                        null
                    )
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        configureSystemBars()
        configureInsets()
        configureWebView()
        configureBackNavigation()

        binding.retryButton.setOnClickListener {
            loadAniketApp()
        }

        if (savedInstanceState != null) {
            binding.webView.restoreState(savedInstanceState)
            binding.loadingOverlay.visibility = View.GONE
        } else {
            loadAniketApp()
        }
    }

    private fun configureSystemBars() {
        val controller = WindowInsetsControllerCompat(window, binding.root)
        controller.isAppearanceLightStatusBars = false
        controller.isAppearanceLightNavigationBars = false
    }

    private fun configureInsets() {
        ViewCompat.setOnApplyWindowInsetsListener(binding.rootContainer) { view, insets ->
            val systemAndIme = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.ime()
            )
            view.setPadding(
                systemAndIme.left,
                systemAndIme.top,
                systemAndIme.right,
                systemAndIme.bottom
            )
            insets
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val webView = binding.webView
        val settings = webView.settings

        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = false
        settings.allowContentAccess = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.setSupportZoom(false)

        webView.addJavascriptInterface(AniketAndroidBridge(), "AniketAndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url ?: return false
                val appHost = Uri.parse(BuildConfig.APP_URL).host
                if (url.host == appHost) {
                    return false
                }
                if (url.scheme == "http" || url.scheme == "https") {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, url))
                    } catch (_: Exception) {
                        // Ignore if no browser available
                    }
                    return true
                }
                return false
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                hasMainFrameError = false
                binding.errorOverlay.visibility = View.GONE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                if (!hasMainFrameError) {
                    binding.loadingOverlay.animate()
                        .alpha(0f)
                        .setDuration(180L)
                        .withEndAction {
                            binding.loadingOverlay.visibility = View.GONE
                            binding.loadingOverlay.alpha = 1f
                        }
                        .start()
                }
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                if (request?.isForMainFrame == true) {
                    hasMainFrameError = true
                    showErrorState(
                        title = getString(R.string.error_load_title),
                        message = getString(R.string.error_load_message)
                    )
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                if (request == null) return
                val wantsAudio = request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)
                if (!wantsAudio) {
                    request.deny()
                    return
                }

                runOnUiThread {
                    val granted = ContextCompat.checkSelfPermission(
                        this@MainActivity,
                        Manifest.permission.RECORD_AUDIO
                    ) == PackageManager.PERMISSION_GRANTED

                    if (granted) {
                        request.grant(request.resources)
                    } else {
                        pendingWebPermissionRequest = request
                        audioPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                    }
                }
            }
        }
    }

    private fun configureBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (binding.webView.canGoBack()) {
                    binding.webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    private fun loadAniketApp() {
        if (!NetworkMonitor.isNetworkAvailable(this)) {
            showErrorState(
                title = getString(R.string.offline_title),
                message = getString(R.string.offline_message)
            )
            return
        }

        hasMainFrameError = false
        binding.errorOverlay.visibility = View.GONE
        binding.loadingOverlay.visibility = View.VISIBLE
        binding.loadingOverlay.alpha = 1f
        binding.webView.loadUrl(BuildConfig.APP_URL)
    }

    private fun showErrorState(title: String, message: String) {
        binding.loadingOverlay.visibility = View.GONE
        binding.errorTitle.text = title
        binding.errorMessage.text = message
        binding.errorOverlay.visibility = View.VISIBLE
    }

    private fun launchAndroidSpeechRecognizer(localeTag: String) {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(
                RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
            )
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, localeTag)
            putExtra(RecognizerIntent.EXTRA_PROMPT, getString(R.string.voice_prompt))
        }

        try {
            speechRecognizerLauncher.launch(intent)
        } catch (_: Exception) {
            dispatchSpeechError("Voice recognition service is unavailable on this device.")
        }
    }

    private fun dispatchSpeechError(message: String) {
        val escaped = JSONObject.quote(message)
        binding.webView.post {
            binding.webView.evaluateJavascript(
                "window.__onAniketAndroidSpeechError && window.__onAniketAndroidSpeechError($escaped);",
                null
            )
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        binding.webView.saveState(outState)
    }

    override fun onDestroy() {
        binding.webView.destroy()
        super.onDestroy()
    }

    inner class AniketAndroidBridge {
        @JavascriptInterface
        fun isAndroidApp(): Boolean = true

        @JavascriptInterface
        fun startVoiceInput(localeTag: String?) {
            val resolvedLocale = if (localeTag.isNullOrBlank()) "en-IN" else localeTag
            runOnUiThread {
                val granted = ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    Manifest.permission.RECORD_AUDIO
                ) == PackageManager.PERMISSION_GRANTED

                if (granted) {
                    launchAndroidSpeechRecognizer(resolvedLocale)
                } else {
                    pendingSpeechLocale = resolvedLocale
                    audioPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                }
            }
        }
    }
}
