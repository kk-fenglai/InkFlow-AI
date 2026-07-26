package com.inkflow.ai.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Draw
import androidx.compose.material.icons.outlined.FolderOpen
import androidx.compose.material.icons.outlined.HistoryEdu
import androidx.compose.material.icons.outlined.PersonOutline
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.inkflow.ai.core.ApiClient
import com.inkflow.ai.core.AuthStore
import com.inkflow.ai.core.DesignTokens
import com.inkflow.ai.core.NetworkMonitor
import com.inkflow.ai.core.SignPdfState
import com.inkflow.ai.core.StudioState
import com.inkflow.ai.features.account.AccountScreen
import com.inkflow.ai.features.auth.ForgotPasswordScreen
import com.inkflow.ai.features.auth.LoginScreen
import com.inkflow.ai.features.auth.RegisterScreen
import com.inkflow.ai.features.library.LibraryScreen
import com.inkflow.ai.features.signpdf.SignPdfScreen
import com.inkflow.ai.features.studio.StudioScreen

private object Routes {
    const val Login = "login"
    const val Register = "register"
    const val Forgot = "forgot"

    const val Studio = "studio"
    const val Library = "library"
    const val SignPdf = "sign"
    const val Account = "account"
}

private data class Tab(val route: String, val label: String, val icon: ImageVector)

/** Primary destinations. Buying credits lives inside Account. */
private val TABS = listOf(
    Tab(Routes.Studio, "Studio", Icons.Outlined.Draw),
    Tab(Routes.Library, "Library", Icons.Outlined.FolderOpen),
    Tab(Routes.SignPdf, "Sign PDF", Icons.Outlined.HistoryEdu),
    Tab(Routes.Account, "Account", Icons.Outlined.PersonOutline),
)

@Composable
fun RootNav(
    authStore: AuthStore,
    apiClient: ApiClient,
    networkMonitor: NetworkMonitor,
) {
    // Sits above every route, signed in or not, so the offline notice reaches the
    // login screen too.
    OfflineWatcher(networkMonitor)

    // Starting the app with no connection leaves the stored session unrestored;
    // pick it up again the moment the device is back online.
    val online by networkMonitor.isOnline.collectAsStateWithLifecycle()
    var wasOffline by remember { mutableStateOf(false) }
    LaunchedEffect(online) {
        if (!online) {
            wasOffline = true
        } else if (wasOffline) {
            wasOffline = false
            if (!authStore.isAuthenticated) authStore.restoreSession()
        }
    }

    if (!authStore.isAuthenticated) {
        val nav = rememberNavController()
        NavHost(navController = nav, startDestination = Routes.Login) {
            composable(Routes.Login) {
                LoginScreen(
                    authStore = authStore,
                    onRegister = { nav.navigate(Routes.Register) },
                    onForgotPassword = { nav.navigate(Routes.Forgot) },
                )
            }
            composable(Routes.Register) {
                RegisterScreen(
                    authStore = authStore,
                    onBack = { nav.popBackStack() },
                )
            }
            composable(Routes.Forgot) {
                ForgotPasswordScreen(
                    apiClient = apiClient,
                    onBack = { nav.popBackStack() },
                )
            }
        }
        return
    }

    val nav = rememberNavController()
    val backStack by nav.currentBackStackEntryAsState()
    val current = backStack?.destination?.route ?: Routes.Studio
    val onTab = TABS.any { it.route == current }

    // Remembered here, not inside the screens: a tab's destination is disposed
    // when you switch away, so screen-local state would be wiped every time.
    val studioState = remember { StudioState() }
    val signPdfState = remember { SignPdfState() }

    Scaffold(
        containerColor = DesignTokens.Background,
        topBar = {
            if (onTab) {
                AppTopBar(credits = authStore.user?.credits)
            }
        },
        bottomBar = {
            if (onTab) {
                BottomTabs(nav = nav, current = current)
            }
        },
    ) { padding ->
        NavHost(
            navController = nav,
            startDestination = Routes.Studio,
            modifier = Modifier.padding(padding),
        ) {
            composable(Routes.Studio) {
                StudioScreen(
                    state = studioState,
                    authStore = authStore,
                    apiClient = apiClient,
                )
            }
            composable(Routes.Library) {
                LibraryScreen(apiClient = apiClient)
            }
            composable(Routes.SignPdf) {
                SignPdfScreen(
                    state = signPdfState,
                    authStore = authStore,
                    apiClient = apiClient,
                )
            }
            composable(Routes.Account) {
                AccountScreen(authStore = authStore, apiClient = apiClient)
            }
        }
    }
}

@Composable
private fun BottomTabs(nav: NavHostController, current: String) {
    Column {
        HorizontalDivider(color = DesignTokens.SurfaceContainerHigh, thickness = 1.dp)
        NavigationBar(containerColor = DesignTokens.SurfaceContainerLow) {
            TABS.forEach { tab ->
                NavigationBarItem(
                    selected = current == tab.route,
                    onClick = {
                        nav.navigate(tab.route) {
                            popUpTo(nav.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    icon = { Icon(tab.icon, contentDescription = tab.label) },
                    label = {
                        Text(
                            tab.label,
                            style = MaterialTheme.typography.labelSmall,
                            maxLines = 1,
                        )
                    },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = DesignTokens.Ink,
                        selectedTextColor = DesignTokens.Ink,
                        unselectedIconColor = DesignTokens.OnSurfaceVariant,
                        unselectedTextColor = DesignTokens.OnSurfaceVariant,
                        indicatorColor = DesignTokens.SurfaceContainerHigh,
                    ),
                )
            }
        }
    }
}
