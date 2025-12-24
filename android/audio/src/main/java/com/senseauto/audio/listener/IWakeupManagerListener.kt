package com.senseauto.audio.listener

interface IWakeupManagerListener {
    fun OnWakeupEnd()
    fun onWakeupError(code:Int, message:String)
}