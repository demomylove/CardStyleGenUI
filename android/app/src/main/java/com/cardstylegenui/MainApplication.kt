package com.cardstylegenui

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    if (BuildConfig.DEBUG) {
      ignoreSSLCertificate()
    }
    loadReactNative(this)
  }

  private fun ignoreSSLCertificate() {
    try {
      val trustAllCerts = arrayOf<javax.net.ssl.TrustManager>(object : javax.net.ssl.X509TrustManager {
        override fun checkClientTrusted(chain: Array<java.security.cert.X509Certificate>, authType: String) {}
        override fun checkServerTrusted(chain: Array<java.security.cert.X509Certificate>, authType: String) {}
        override fun getAcceptedIssuers(): Array<java.security.cert.X509Certificate> = arrayOf()
      })

      val sslContext = javax.net.ssl.SSLContext.getInstance("SSL")
      sslContext.init(null, trustAllCerts, java.security.SecureRandom())
      val sslSocketFactory = sslContext.socketFactory

      val builder = okhttp3.OkHttpClient.Builder()
      builder.connectTimeout(0, java.util.concurrent.TimeUnit.MILLISECONDS)
      builder.readTimeout(0, java.util.concurrent.TimeUnit.MILLISECONDS)
      builder.writeTimeout(0, java.util.concurrent.TimeUnit.MILLISECONDS)
      builder.cookieJar(com.facebook.react.modules.network.ReactCookieJarContainer())
      
      builder.sslSocketFactory(sslSocketFactory, trustAllCerts[0] as javax.net.ssl.X509TrustManager)
      builder.hostnameVerifier { _, _ -> true }

      com.facebook.react.modules.network.OkHttpClientProvider.setOkHttpClientFactory { builder.build() }
    } catch (e: Exception) {
      throw RuntimeException(e)
    }
  }
}
