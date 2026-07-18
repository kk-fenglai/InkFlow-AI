package com.inkflow.ai.features.auth

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.MailOutline
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.inkflow.ai.core.AppConfig
import com.inkflow.ai.core.AuthStore
import com.inkflow.ai.core.DesignTokens
import com.inkflow.ai.ui.BrandTopBar
import com.inkflow.ai.ui.ErrorText
import com.inkflow.ai.ui.FieldLabel
import com.inkflow.ai.ui.InkCard
import com.inkflow.ai.ui.InkPrimaryButton
import com.inkflow.ai.ui.InkTextField
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    authStore: AuthStore,
    onRegister: () -> Unit,
    onForgotPassword: () -> Unit,
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
    ) {
        BrandTopBar()

        Column(modifier = Modifier.padding(20.dp)) {
            Spacer(Modifier.height(24.dp))

            InkCard(modifier = Modifier.fillMaxWidth()) {
                Text(
                    "Welcome Back",
                    style = MaterialTheme.typography.displaySmall,
                    color = DesignTokens.Ink,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    "Continue your creative signature journey",
                    style = MaterialTheme.typography.bodyLarge,
                    color = DesignTokens.OnSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(28.dp))

                FieldLabel("Email Address")
                Spacer(Modifier.height(8.dp))
                InkTextField(
                    value = email,
                    onValueChange = { email = it },
                    placeholder = "name@company.com",
                    leadingIcon = Icons.Outlined.MailOutline,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(18.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    FieldLabel("Password")
                    Text(
                        "Forgot password?",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = DesignTokens.Ink,
                        modifier = Modifier.clickable { onForgotPassword() },
                    )
                }
                Spacer(Modifier.height(8.dp))
                InkTextField(
                    value = password,
                    onValueChange = { password = it },
                    placeholder = "••••••••",
                    leadingIcon = Icons.Outlined.Lock,
                    trailingIcon = {
                        IconButton(onClick = { showPassword = !showPassword }) {
                            Icon(
                                if (showPassword) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                                contentDescription = "Toggle password visibility",
                                tint = DesignTokens.OnSurfaceVariant,
                            )
                        }
                    },
                    visualTransformation = if (showPassword) {
                        VisualTransformation.None
                    } else {
                        PasswordVisualTransformation()
                    },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth(),
                )

                authStore.errorMessage?.let {
                    Spacer(Modifier.height(12.dp))
                    ErrorText(it)
                }

                Spacer(Modifier.height(24.dp))
                InkPrimaryButton(
                    text = "Sign In",
                    onClick = { scope.launch { authStore.login(email, password) } },
                    enabled = email.isNotBlank() && password.isNotBlank(),
                    loading = authStore.isLoading,
                    showArrow = true,
                    modifier = Modifier.fillMaxWidth(),
                )

                Spacer(Modifier.height(20.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onRegister() },
                    horizontalArrangement = Arrangement.Center,
                ) {
                    Text(
                        "Don't have an account?",
                        style = MaterialTheme.typography.labelMedium,
                        color = DesignTokens.OnSurfaceVariant,
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        "Sign up",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = DesignTokens.Ink,
                    )
                }
            }

            Spacer(Modifier.height(28.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
            ) {
                FooterLink("Privacy Policy") {
                    context.startActivity(
                        Intent(Intent.ACTION_VIEW, Uri.parse("${AppConfig.API_BASE_URL}/privacy")),
                    )
                }
                Spacer(Modifier.width(28.dp))
                FooterLink("Terms of Service") {
                    context.startActivity(
                        Intent(Intent.ACTION_VIEW, Uri.parse("${AppConfig.API_BASE_URL}/terms")),
                    )
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun FooterLink(text: String, onClick: () -> Unit) {
    Text(
        text,
        style = MaterialTheme.typography.labelMedium,
        color = DesignTokens.OnSurfaceVariant,
        modifier = Modifier.clickable(onClick = onClick),
    )
}
