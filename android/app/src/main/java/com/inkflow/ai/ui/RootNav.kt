package com.inkflow.ai.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AutoFixHigh
import androidx.compose.material.icons.outlined.Draw
import androidx.compose.material.icons.outlined.FolderOpen
import androidx.compose.material.icons.outlined.HistoryEdu
import androidx.compose.material.icons.outlined.Payments
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.inkflow.ai.core.ApiClient
import com.inkflow.ai.core.AuthStore
import com.inkflow.ai.core.DesignTokens
import com.inkflow.ai.features.account.AccountScreen
import com.inkflow.ai.features.auth.ForgotPasswordScreen
import com.inkflow.ai.features.auth.LoginScreen
import com.inkflow.ai.features.auth.RegisterScreen
import com.inkflow.ai.features.library.LibraryScreen
import com.inkflow.ai.features.pricing.PricingScreen
import com.inkflow.ai.features.refine.RefineScreen
import com.inkflow.ai.features.signpdf.SignPdfScreen
import com.inkflow.ai.features.studio.StudioScreen

private object Routes {
    const val Login = "login"
    const val Register = "register"
    const val Forgot = "forgot"

    const val Studio = "studio"
    const val Library = "library"
    const val SignPdf = "sign"
    const val Refine = "refine"
    const val Pricing = "pricing"

    const val Account = "account"
}

/** Primary destinations — mirrors the website's NAV_LINKS order. */
private data class Tab(val route: String, val label: String, val icon: ImageVector)

private val TABS = listOf(
    Tab(Routes.Studio, "Studio", Icons.Outlined.Draw),
    Tab(Routes.Library, "Library", Icons.Outlined.FolderOpen),
    Tab(Routes.SignPdf, "Sign PDF", Icons.Outlined.HistoryEdu),
    Tab(Routes.Refine, "Refine", Icons.Outlined.AutoFixHigh),
    Tab(Routes.Pricing, "Pricing", Icons.Outlined.Payments),
)

@Composable
fun RootNav(
    authStore: AuthStore,
    apiClient: ApiClient,
) {
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

    Scaffold(
        containerColor = DesignTokens.Background,
        topBar = {
            if (onTab) {
                val user = authStore.user
                AppTopBar(
                    credits = user?.credits,
                    initial = (user?.name ?: user?.email ?: "?"),
                    onAccountClick = { nav.navigate(Routes.Account) },
                )
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
                StudioScreen(authStore = authStore, apiClient = apiClient)
            }
            composable(Routes.Library) {
                LibraryScreen(apiClient = apiClient)
            }
            composable(Routes.SignPdf) {
                SignPdfScreen(authStore = authStore, apiClient = apiClient)
            }
            composable(Routes.Refine) {
                RefineScreen(apiClient = apiClient)
            }
            composable(Routes.Pricing) {
                PricingScreen(authStore = authStore, apiClient = apiClient)
            }
            composable(Routes.Account) {
                AccountScreen(
                    authStore = authStore,
                    apiClient = apiClient,
                    onBack = { nav.popBackStack() },
                    onBuyCredits = {
                        nav.navigate(Routes.Pricing) {
                            popUpTo(nav.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                )
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
