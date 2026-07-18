package com.inkflow.ai.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AutoFixHigh
import androidx.compose.material.icons.outlined.Create
import androidx.compose.material.icons.outlined.FolderOpen
import androidx.compose.material.icons.outlined.Payments
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
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.Column
import androidx.navigation.NavGraph.Companion.findStartDestination
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
    const val Refine = "refine"
    const val Library = "library"
    const val Account = "account"
    const val Pricing = "pricing"
    const val SignPdf = "signpdf"
}

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

    Scaffold(
        containerColor = DesignTokens.Background,
        bottomBar = {
            if (current != Routes.SignPdf) {
                Column {
                    HorizontalDivider(color = DesignTokens.SurfaceContainerHigh, thickness = 1.dp)
                    NavigationBar(containerColor = DesignTokens.SurfaceContainerLow) {
                        listOf(
                            Triple(Routes.Studio, "Studio", Icons.Outlined.Create),
                            Triple(Routes.Refine, "Refine", Icons.Outlined.AutoFixHigh),
                            Triple(Routes.Library, "Library", Icons.Outlined.FolderOpen),
                            Triple(Routes.Account, "Account", Icons.Outlined.PersonOutline),
                            Triple(Routes.Pricing, "Pricing", Icons.Outlined.Payments),
                        ).forEach { (route, label, icon) ->
                            NavigationBarItem(
                                selected = current == route,
                                onClick = {
                                    nav.navigate(route) {
                                        popUpTo(nav.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                                icon = { Icon(icon, contentDescription = label) },
                                label = {
                                    Text(label, style = MaterialTheme.typography.labelSmall)
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
        },
    ) { padding ->
        NavHost(
            navController = nav,
            startDestination = Routes.Studio,
            modifier = Modifier.padding(padding),
        ) {
            composable(Routes.Studio) {
                StudioScreen(
                    authStore = authStore,
                    apiClient = apiClient,
                    onSignPdf = { nav.navigate(Routes.SignPdf) },
                )
            }
            composable(Routes.Refine) {
                RefineScreen(apiClient = apiClient)
            }
            composable(Routes.Library) {
                LibraryScreen(apiClient = apiClient)
            }
            composable(Routes.Account) {
                AccountScreen(
                    authStore = authStore,
                    apiClient = apiClient,
                    onBuyCredits = {
                        nav.navigate(Routes.Pricing) {
                            popUpTo(nav.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                )
            }
            composable(Routes.Pricing) {
                PricingScreen(authStore = authStore, apiClient = apiClient)
            }
            composable(Routes.SignPdf) {
                SignPdfScreen(
                    authStore = authStore,
                    apiClient = apiClient,
                    onBack = { nav.popBackStack() },
                )
            }
        }
    }
}
