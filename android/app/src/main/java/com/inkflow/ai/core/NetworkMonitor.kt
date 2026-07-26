package com.inkflow.ai.core

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Tracks whether the device currently has a working internet connection.
 * Registered once for the process lifetime from InkFlowApp; the UI collects
 * [isOnline].
 */
class NetworkMonitor(context: Context) {
    private val manager = context.getSystemService(ConnectivityManager::class.java)

    private val _isOnline = MutableStateFlow(true)
    val isOnline: StateFlow<Boolean> = _isOnline.asStateFlow()

    private val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) = refresh()

        override fun onLost(network: Network) = refresh()

        override fun onUnavailable() = refresh()

        override fun onCapabilitiesChanged(network: Network, caps: NetworkCapabilities) = refresh()
    }

    fun start() {
        // The *default* network is the one requests actually travel over. A
        // capability-filtered request misses the drop when a second, unusable
        // network (cellular with no data) is still around.
        runCatching { manager?.registerDefaultNetworkCallback(callback) }
            .onFailure { Log.w(TAG, "Network callback registration failed", it) }
        refresh()
    }

    /** Recomputes from the active network. Also called when the user taps Retry. */
    fun refresh() {
        val caps = manager?.let { it.getNetworkCapabilities(it.activeNetwork) }
        _isOnline.value = caps != null &&
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }

    private companion object {
        const val TAG = "InkFlowNetwork"
    }
}
