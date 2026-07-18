package com.inkflow.ai.features.auth

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.MailOutline
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.inkflow.ai.core.ApiClient
import com.inkflow.ai.core.DesignTokens
import com.inkflow.ai.ui.ErrorText
import com.inkflow.ai.ui.FieldLabel
import com.inkflow.ai.ui.InkCard
import com.inkflow.ai.ui.InkPrimaryButton
import com.inkflow.ai.ui.InkTextField
import kotlinx.coroutines.launch

@Composable
fun ForgotPasswordScreen(
    apiClient: ApiClient,
    onBack: () -> Unit,
) {
    var email by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    var sent by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Column(modifier = Modifier.fillMaxSize()) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 6.dp),
            ) {
                IconButton(onClick = onBack, modifier = Modifier.align(Alignment.CenterStart)) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = DesignTokens.Ink,
                    )
                }
                Text(
                    "InkFlow AI",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = DesignTokens.Ink,
                    modifier = Modifier.align(Alignment.Center),
                )
            }
            HorizontalDivider(color = DesignTokens.SurfaceContainerHigh, thickness = 1.dp)
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
        ) {
            Spacer(Modifier.height(48.dp))

            InkCard(modifier = Modifier.fillMaxWidth()) {
                Text(
                    if (sent) "Check Your Email" else "Reset Password",
                    style = MaterialTheme.typography.displaySmall,
                    color = DesignTokens.Ink,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    if (sent) {
                        "If an account exists for $email, a reset link is on its way."
                    } else {
                        "Enter your email to receive a reset link"
                    },
                    style = MaterialTheme.typography.bodyLarge,
                    color = DesignTokens.OnSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(28.dp))

                if (!sent) {
                    FieldLabel("Email Address")
                    Spacer(Modifier.height(8.dp))
                    InkTextField(
                        value = email,
                        onValueChange = { email = it },
                        placeholder = "name@example.com",
                        leadingIcon = Icons.Outlined.MailOutline,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        modifier = Modifier.fillMaxWidth(),
                    )

                    error?.let {
                        Spacer(Modifier.height(12.dp))
                        ErrorText(it)
                    }

                    Spacer(Modifier.height(24.dp))
                    InkPrimaryButton(
                        text = "Send Reset Link",
                        onClick = {
                            scope.launch {
                                sending = true
                                error = null
                                try {
                                    apiClient.forgotPassword(email.trim())
                                    sent = true
                                } catch (e: Exception) {
                                    error = e.message ?: "Could not send reset link."
                                } finally {
                                    sending = false
                                }
                            }
                        },
                        enabled = email.isNotBlank(),
                        loading = sending,
                        showArrow = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }

                Spacer(Modifier.height(20.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onBack() },
                    horizontalArrangement = Arrangement.Center,
                ) {
                    Text(
                        "Remembered your password?",
                        style = MaterialTheme.typography.labelMedium,
                        color = DesignTokens.OnSurfaceVariant,
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        "Sign In",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = DesignTokens.Ink,
                    )
                }
            }
        }

        Text(
            "INKFLOW AI • SIGNATURE INTELLIGENCE",
            style = MaterialTheme.typography.labelSmall,
            color = DesignTokens.OnSurfaceVariant.copy(alpha = 0.5f),
            textAlign = TextAlign.Center,
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 28.dp),
        )
    }
}
