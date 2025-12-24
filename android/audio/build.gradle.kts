plugins {
    id("com.android.library")
    kotlin("android") // 如果你用 Kotlin
}

android {
    namespace = "com.senseauto.audio"
    compileSdk = 35

    defaultConfig {
        minSdk = 29

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        consumerProguardFiles("consumer-rules.pro")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlin {
        // ⭐ 核心：统一 Kotlin JVM target
        jvmToolchain(17)
    }

}

dependencies {
//    api(fileTree(mapOf("dir" to "libs", "include" to listOf("*.aar"))))
    implementation(libs.spotifyappremote)
    implementation(project(":common"))

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.android.material)
    implementation(libs.androidx.media3.common.ktx)
    implementation(libs.androidx.media3.exoplayer)
    testImplementation(libs.junit)
//    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    implementation(libs.gson)
    implementation(libs.okhttp)

    implementation(libs.kotlin.reflect)
    
    // 添加 React Native 依赖
    implementation("com.facebook.react:react-android")
}