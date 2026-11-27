const loginForm = document.querySelector("#login-form");
const identifierInput = document.querySelector("#identifier");
const passwordInput = document.querySelector("#password");
const feedback = document.querySelector("#feedback");

function setFieldError(input, errorId, message) {
    document.querySelector(`#${errorId}`).textContent = message;
    input.setAttribute("aria-invalid", message ? "true" : "false");
    return !message;
}

function setFeedback(message, isError) {
    feedback.textContent = message;
    feedback.classList.toggle("error-state", isError);
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFeedback("", false);

    const identifier = identifierInput.value.trim();
    const password = passwordInput.value;
    const validIdentifier = setFieldError(
        identifierInput,
        "identifier-error",
        identifier ? "" : "Nombre, telefono o gmail incorrecto"
    );
    const validPassword = setFieldError(
        passwordInput,
        "password-error",
        password ? "" : "Introduce tu contraseña."
    );

    if (!validIdentifier || !validPassword) {
        loginForm.querySelector('[aria-invalid="true"]').focus();
        return;
    }

    const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ identifier, password })
        });
        const result = await response.json();

        if (!response.ok) {
            if (result.field === "identifier") {
                setFieldError(identifierInput, "identifier-error", result.message);
                identifierInput.focus();
            } else if (result.field === "password") {
                setFieldError(passwordInput, "password-error", result.message);
                passwordInput.focus();
            } else {
                setFeedback(result.message || "No se pudo iniciar sesión.", true);
            }
            return;
        }

        loginForm.reset();
        setFieldError(identifierInput, "identifier-error", "");
        setFieldError(passwordInput, "password-error", "");
        setFeedback("Sesión iniciada correctamente.", false);
    } catch {
        setFeedback("No se pudo contactar al servidor. Inicia la aplicación desde el servidor local e inténtalo de nuevo.", true);
    } finally {
        submitButton.disabled = false;
    }
});

[identifierInput, passwordInput].forEach((input) => {
    input.addEventListener("input", () => {
        if (input.getAttribute("aria-invalid") === "true") {
            const errorId = input === identifierInput ? "identifier-error" : "password-error";
            setFieldError(input, errorId, "");
        }
        setFeedback("", false);
    });
});

document.querySelector("#forgot-password").addEventListener("click", () => {
    setFeedback("La recuperación por correo o teléfono requiere configurar un servicio de envío.", true);
});

document.querySelector("#google-login").addEventListener("click", () => {
    setFeedback("El inicio de sesión con Google requiere configurar OAuth y aún no está disponible.", true);
});