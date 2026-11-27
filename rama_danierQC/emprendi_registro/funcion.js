const signupForm = document.querySelector("#signup-form");
const contactInput = document.querySelector("#contact");
const passwordInput = document.querySelector("#password");
const fullNameInput = document.querySelector("#full-name");
const usernameInput = document.querySelector("#username");
const daySelect = document.querySelector("#birth-day");
const monthSelect = document.querySelector("#birth-month");
const yearSelect = document.querySelector("#birth-year");
const formStatus = document.querySelector("#form-status");

const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

for (let day = 1; day <= 31; day += 1) {
    daySelect.add(new Option(String(day), String(day)));
}

months.forEach((month, index) => {
    monthSelect.add(new Option(month, String(index + 1)));
});

const currentYear = new Date().getFullYear();
for (let year = currentYear; year >= currentYear - 120; year -= 1) {
    yearSelect.add(new Option(String(year), String(year)));
}

function showError(input, errorId, message) {
    document.querySelector(`#${errorId}`).textContent = message;
    input.setAttribute("aria-invalid", message ? "true" : "false");
    input.setCustomValidity(message);
    return !message;
}

function validateContact() {
    const value = contactInput.value.trim();
    let message = "";

    if (!value) {
        message = "Introduce tu número de móvil o correo electrónico.";
    } else {
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        const isPhone = /^\+?[0-9][0-9\s().-]*$/.test(value)
            && value.replace(/\D/g, "").length >= 7
            && value.replace(/\D/g, "").length <= 15;

        if (!isEmail && !isPhone) {
            message = "Introduce un correo válido o un número de móvil válido.";
        }
    }

    return showError(contactInput, "contact-error", message);
}

function validatePassword() {
    let message = "";

    if (!passwordInput.value) {
        message = "Introduce una combinación de al menos seis números, letras y signos de puntuación (como ! y &).";
    } else if (passwordInput.value.length < 9 || !/[A-ZÁÉÍÓÚÜÑ]/.test(passwordInput.value)) {
        message = "Usa al menos 9 caracteres e incluye una letra mayúscula.";
    }

    return showError(passwordInput, "password-error", message);
}

function validateBirthDate() {
    const day = Number(daySelect.value);
    const month = Number(monthSelect.value);
    const year = Number(yearSelect.value);
    let message = "";

    if (!day || !month || !year) {
        message = "Selecciona tu fecha de nacimiento.";
    } else {
        const birthday = new Date(year, month - 1, day);
        if (
            birthday.getFullYear() !== year
            || birthday.getMonth() !== month - 1
            || birthday.getDate() !== day
        ) {
            message = "Selecciona una fecha de nacimiento válida.";
        } else {
            const today = new Date();
            const cutoffYear = today.getFullYear() - 18;
            const lastDayOfCutoffMonth = new Date(cutoffYear, today.getMonth() + 1, 0).getDate();
            const eighteenthBirthday = new Date(
                cutoffYear,
                today.getMonth(),
                Math.min(today.getDate(), lastDayOfCutoffMonth)
            );

            if (birthday > eighteenthBirthday) {
                message = "Necesitas ser mayor de edad para crear tu cuenta :D";
            }
        }
    }

    document.querySelector("#birth-error").textContent = message;
    [daySelect, monthSelect, yearSelect].forEach((input) => {
        input.setAttribute("aria-invalid", message ? "true" : "false");
        input.setCustomValidity(message);
    });
    return !message;
}

function validateRequiredText(input, errorId, emptyMessage) {
    return showError(input, errorId, input.value.trim() ? "" : emptyMessage);
}

function displayFormStatus(message, isError) {
    formStatus.textContent = message;
    formStatus.classList.toggle("error-state", isError);
}

[
    [contactInput, validateContact],
    [passwordInput, validatePassword],
    [fullNameInput, () => validateRequiredText(fullNameInput, "full-name-error", "Introduce tu nombre completo.")],
    [usernameInput, () => validateRequiredText(usernameInput, "username-error", "Selecciona un nombre de usuario para tu cuenta.")]
].forEach(([input, validate]) => {
    input.addEventListener("input", () => {
        if (input.getAttribute("aria-invalid") === "true") {
            validate();
        }
    });
});

[daySelect, monthSelect, yearSelect].forEach((input) => {
    input.addEventListener("change", () => {
        if (document.querySelector("#birth-error").textContent) {
            validateBirthDate();
        }
    });
});

signupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    displayFormStatus("", false);

    const valid = [
        validateContact(),
        validatePassword(),
        validateBirthDate(),
        validateRequiredText(fullNameInput, "full-name-error", "Introduce tu nombre completo."),
        validateRequiredText(usernameInput, "username-error", "Selecciona un nombre de usuario para tu cuenta.")
    ].every(Boolean);

    if (!valid) {
        signupForm.querySelector('[aria-invalid="true"]').focus();
        return;
    }

    const birthDate = [
        yearSelect.value,
        monthSelect.value.padStart(2, "0"),
        daySelect.value.padStart(2, "0")
    ].join("-");
    const submitButton = signupForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
            contact: contactInput.value.trim(),
            password: passwordInput.value,
            birth_date: birthDate,
            full_name: fullNameInput.value.trim(),
            username: usernameInput.value.trim()
        })
    })
        .then(async (response) => {
            const result = await response.json();
            if (!response.ok) {
                if (result.field === "contact") {
                    showError(contactInput, "contact-error", result.message);
                } else if (result.field === "username") {
                    showError(usernameInput, "username-error", result.message);
                } else {
                    displayFormStatus(result.message || "No se pudo crear la cuenta.", true);
                }
                return;
            }

            displayFormStatus("Cuenta creada. Ya puedes iniciar sesión.", false);
            signupForm.reset();
            [daySelect, monthSelect, yearSelect].forEach((select) => {
                select.value = "";
            });
        })
        .catch(() => {
            displayFormStatus("No se pudo contactar al servidor. Inicia la aplicación desde el servidor local e inténtalo de nuevo.", true);
        })
        .finally(() => {
            submitButton.disabled = false;
        });
});

signupForm.addEventListener("input", () => {
    displayFormStatus("", false);
});

signupForm.addEventListener("change", () => {
    displayFormStatus("", false);
});