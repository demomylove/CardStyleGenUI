package com.senseauto.audio.listener

interface ITtsManagerListener {
    fun onTtsStart()
    fun onTtsEnd()
    fun onTtsError(code:Int, message:String)
}