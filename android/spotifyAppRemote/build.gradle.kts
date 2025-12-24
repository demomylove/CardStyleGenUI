plugins {
    base
}
//
//configurations.maybeCreate("default")
//artifacts.add("default", file("libs/asr-ws-release-v1.3.0-20241106-a156a736.aar"))
//artifacts.add("default", file("libs/tts-ws-release-v1.3.0-20241127-ce8dbf03.aar"))
//artifacts.add("default", file("libs/unisound-active-release-v1.0.1-20240626.aar"))
//artifacts.add("default", file("libs/unisound-kws-release-v1.0.6-20240628-22cc303.aar"))
//artifacts.add("default", file("libs/audioLib.aar"))
//artifacts.add("default", file("libs/NaviTts.aar"))
//artifacts.add("default", file("libs/onsdk_all.aar"))
//artifacts.add("default", file("libs/BaiduLBS_Android.aar"))
//

configurations.maybeCreate("default")
val aarFiles = fileTree(mapOf("dir" to "libs", "include" to listOf("*.aar")))

aarFiles.files.forEach { file ->
    artifacts.add("default", file)
}

group = "com.senseauto.remote"
version = "0.0.1"