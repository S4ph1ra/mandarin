// =====================================================
// AUTH.JS : CONNEXION, INSCRIPTION, DÉCONNEXION
// =====================================================

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import { auth } from "./firebase.js";
import { state } from "./state.js";
import {
    AUTH_ERRORS,
    LOGIN_ERROR,
    REGISTER_EMPTY,
    REGISTER_MISMATCH,
    TEXTS
} from "./config.js";

export function initAuth({ onLogin, onLogout }) {

    const loginPage = document.getElementById("login-page");
    const registerForm = document.getElementById("register-form");
    const showRegisterBtn = document.getElementById("show-register");
    const backToLoginBtn = document.getElementById("back-to-login");

    const loginEmail = document.getElementById("login-email");
    const loginPassword = document.getElementById("login-password");
    const loginButton = document.getElementById("email-login");

    const registerEmail = document.getElementById("register-email");
    const registerPassword = document.getElementById("register-password");
    const confirmPassword = document.getElementById("register-confirm-password");
    const createAccountBtn = document.getElementById("create-account-btn");

    const loginMessage = document.getElementById("login-message");
    const googleButton = document.getElementById("google-login");
    const logoutBtn = document.getElementById("logout-btn");

    // Éléments cachés quand on affiche l'inscription
    const loginElements = [
        googleButton,
        document.querySelector(".login-separator"),
        loginEmail,
        loginPassword,
        loginButton,
        document.querySelector(".register-text")
    ];

    function errorText(error) {
        return AUTH_ERRORS[error.code] || AUTH_ERRORS.default;
    }

    // Afficher l'inscription
    showRegisterBtn.addEventListener("click", () => {
        loginElements.forEach(element => element.style.display = "none");
        registerForm.style.display = "block";
        loginMessage.textContent = "";
    });

    // Revenir à la connexion
    backToLoginBtn.addEventListener("click", () => {
        registerForm.style.display = "none";
        loginElements.forEach(element => element.style.display = "");
        loginMessage.textContent = "";
    });

    // Créer un compte
    createAccountBtn.addEventListener("click", async () => {
        const email = registerEmail.value.trim();
        const password = registerPassword.value;
        const confirmation = confirmPassword.value;

        if (!email || !password || !confirmation) {
            loginMessage.textContent = REGISTER_EMPTY;
            return;
        }

        if (password !== confirmation) {
            loginMessage.textContent = REGISTER_MISMATCH;
            return;
        }

        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
            loginMessage.textContent = errorText(error);
        }
    });

    // Connexion par e-mail
    loginButton.addEventListener("click", async () => {
        try {
            await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginPassword.value);
        } catch (error) {
            loginMessage.textContent = LOGIN_ERROR;
        }
    });

    // Connexion avec Google
    googleButton.addEventListener("click", async () => {
        try {
            await signInWithPopup(auth, new GoogleAuthProvider());
        } catch (error) {
            loginMessage.textContent = errorText(error);
        }
    });

    // Déconnexion
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error(error);
            alert(TEXTS.logoutError);
        }
    });

    // Surveiller l'état de connexion
    onAuthStateChanged(auth, async user => {
        state.user = user;
        loginPage.style.display = user ? "none" : "flex";

        if (user) {
            loginMessage.textContent = "";
            await onLogin();
        } else {
            onLogout();
        }
    });
}
