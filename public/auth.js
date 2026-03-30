const API = "http://localhost:3000";

/* =========================
   REGISTER
========================= */
async function register() {
    const res = await fetch(API + "/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: username.value,
            password: password.value
        })
    });

    const text = await res.text();
    msg.innerText = text;
}

/* =========================
   LOGIN (UPDATED WITH PROFILE CHECK)
========================= */
async function login() {
    const res = await fetch(API + "/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: username.value,
            password: password.value
        })
    });

    let data;

    try {
        data = await res.json();
    } catch (err) {
        msg.innerText = "Login failed (server error)";
        return;
    }

    // ❌ INVALID LOGIN
    if (!res.ok) {
    msg.innerText = data.message || "Login failed";
    return;
}

    // 💾 SAVE USER SESSION
    localStorage.setItem("user", JSON.stringify(data));

    // 🎯 STEP 5: PROFILE REDIRECT LOGIC
    if (data.profileComplete === true) {
        window.location = "dashboard.html";
    } else {
        window.location = "profile.html";
    }
}