package com.inkflow.ai.features.auth

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
import androidx.compose.material.icons.outlined.PersonOutline
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
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
fun RegisterScreen(
    authStore: AuthStore,
    onBack: () -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

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
                    "Create Account",
                    style = MaterialTheme.typography.displaySmall,
                    color = DesignTokens.Ink,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    "Begin your creative signature journey",
                    style = MaterialTheme.typography.bodyLarge,
                    color = DesignTokens.OnSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(28.dp))

                FieldLabel("Name (Optional)")
                Spacer(Modifier.height(8.dp))
                InkTextField(
                    value = name,
                    onValueChange = { name = it },
                    placeholder = "Eleanor Vance",
                    leadingIcon = Icons.Outlined.PersonOutline,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(18.dp))

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

                FieldLabel("Password (8+ Characters)")
                Spacer(Modifier.height(8.dp))
                InkTextField(
                    value = password,
                    onValueChange = { password = it },
                    placeholder = "••••••••",
                    leadingIcon = Icons.Outlined.Lock,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth(),
                )

                authStore.errorMessage?.let {
                    Spacer(Modifier.height(12.dp))
                    ErrorText(it)
                }

                Spacer(Modifier.height(24.dp))
                InkPrimaryButton(
                    text = "Create Account",
                    onClick = { scope.launch { authStore.register(email, password, name) } },
                    enabled = email.isNotBlank() && password.length >= 8,
                    loading = authStore.isLoading,
                    showArrow = true,
                    modifier = Modifier.fillMaxWidth(),
                )

                Spacer(Modifier.height(20.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onBack() },
                    horizontalArrangement = Arrangement.Center,
                ) {
                    Text(
                        "Already have an account?",
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
    }
}
