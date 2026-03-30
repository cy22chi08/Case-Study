console.log("APP JS LOADED");
const API = "http://localhost:3000";

let user = JSON.parse(localStorage.getItem("user"));

if (!user) window.location = "login.html";

/* =========================
   LOAD TASKS
========================= */
async function loadTasks() {
    const res = await fetch(`${API}/tasks/${user.id}`);
    const data = await res.json();

    const todoList = document.getElementById("todoList");
    const dailyList = document.getElementById("dailyList");
    const habitList = document.getElementById("habitList");

    todoList.innerHTML = "";
    dailyList.innerHTML = "";
    habitList.innerHTML = "";

    data.forEach(task => {

        if (Number(task.completed) === 1) return;

        const type = task.type || "todo";

        const li = document.createElement("li");

        li.style.padding = "12px";
        li.style.borderRadius = "10px";
        li.style.marginBottom = "10px";
        li.style.background = "#1e1e1e";

        li.innerHTML = `
            <!-- SECTION 1: MAIN CHECKBOX -->
            <div style="margin-bottom:8px;">
                <input type="checkbox" class="task-checkbox" data-id="${task.id}">
            </div>

            <!-- SECTION 2: TITLE + NOTES -->
            <div style="
                background:#2a2a2a;
                padding:10px;
                border-radius:8px;
                margin-bottom:10px;
            ">
                <div style="font-size:16px; font-weight:bold; margin-bottom:5px;">
                    ${task.title}
                </div>

                <div style="font-size:12px; color:#aaa;">
                    ${task.notes || "No notes"}
                </div>
            </div>

            <!-- SECTION 3: CHECKLIST -->
            <div style="
                background:#222;
                padding:10px;
                border-radius:8px;
            ">
                <div style="font-size:12px; margin-bottom:6px; color:#ccc;">
                    Checklist
                </div>

                <div class="checklist-container"></div>
            </div>
        `;

        // CHECKLIST RENDERING (UNCHANGED LOGIC)
        const checklistContainer = li.querySelector(".checklist-container");

        try {
            const checklist = JSON.parse(task.checklist || "[]");

            checklist.forEach(item => {
                const div = document.createElement("div");

                div.innerHTML = `
                    <label style="display:block; margin:4px 0; font-size:13px; color:#ddd;">
                        <input type="checkbox" class="sub-task-checkbox">
                        ${item}
                    </label>
                `;

                checklistContainer.appendChild(div);
            });

        } catch (err) {
            console.log("Checklist parse error:", err);
        }

        // TYPE DISTRIBUTION (UNCHANGED)
        if (type === "todo") todoList.appendChild(li);
        else if (type === "daily") dailyList.appendChild(li);
        else if (type === "habit") habitList.appendChild(li);
        else todoList.appendChild(li);
    });
}

/* =========================
   TASK DROPDOWN
========================= */
function toggleTaskMenu() {
    document.getElementById("taskMenu").classList.toggle("hidden");
}

let currentType = "";
let selectedTag = "";
let habitType = "";

/* =========================
   OPEN MODAL
========================= */
function openModal(type) {
    currentType = type;

    document.getElementById("taskModal").classList.remove("hidden");
    document.getElementById("taskMenu").classList.add("hidden");

    selectedTag = "";
    habitType = "";

    document.getElementById("taskTitle").value = "";
    document.getElementById("taskNotes").value = "";
    document.getElementById("checklistContainer").innerHTML = "";

    document.querySelectorAll(".tags button").forEach(btn => {
        btn.style.background = "#333";
    });

    document.getElementById("dailyOptions")
        .classList.toggle("hidden", type !== "daily");

    document.getElementById("habitOptions")
        .classList.toggle("hidden", type !== "habit");

    document.getElementById("modalTitle").innerText =
        type === "todo" ? "Create To-Do" :
        type === "daily" ? "Create Daily" :
        "Create Habit";
}

function closeModal() {
    document.getElementById("taskModal").classList.add("hidden");
}

/* =========================
   CHECKLIST
========================= */
function addChecklistItem() {
    const container = document.getElementById("checklistContainer");

    const wrapper = document.createElement("div");
    wrapper.classList.add("checklist-item");

    wrapper.innerHTML = `
        <input type="text" placeholder="Checklist item">
        <button type="button" class="remove-btn">-</button>
    `;

    // delete functionality
    wrapper.querySelector(".remove-btn").onclick = () => {
        wrapper.remove();
    };

    container.appendChild(wrapper);
}

/* =========================
   TAG SELECT
========================= */
function selectTag(tag, el) {
    selectedTag = tag;

    document.querySelectorAll(".tags button").forEach(btn => {
        btn.style.background = "#333";
    });

    el.style.background = "#ff3b3b";
}

/* =========================
   HABIT TYPE
========================= */
function setHabit(type, el) {
    habitType = type;

    document.querySelectorAll("#habitOptions button").forEach(btn => {
        btn.style.background = "#333";
    });

    el.style.background = "#ff3b3b";
}

/* =========================
   CREATE TASK
========================= */
async function createTask() {
    const title = document.getElementById("taskTitle").value.trim();
    const notes = document.getElementById("taskNotes").value;

    const checklistInputs = document.querySelectorAll("#checklistContainer input");
    const checklistData = Array.from(checklistInputs).map(i => i.value);

    const difficulty = document.getElementById("difficulty").value;
    const dueDate = document.getElementById("dueDate").value;
    const repeatType = document.getElementById("repeatType")?.value || null;

    if (!title) return alert("Title is required!");
    if (!selectedTag) return alert("Select a tag!");

    let xp = 0;

    if (selectedTag === "quick") xp = 5;
    if (selectedTag === "routine") xp = 7;
    if (selectedTag === "focus") xp = 10;

    if (user.class === "nerd" && selectedTag === "focus") xp = 15;
    if (user.class === "gymrat" && selectedTag === "routine") xp = 15;
    if (user.class === "student" && selectedTag === "quick") xp = 15;

    await fetch(`${API}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            user_id: user.id,
            title,
            type: currentType,
            notes,
            checklist: JSON.stringify(checklistData),
            difficulty,
            dueDate,
            repeatType,
            habitType,
            tag: selectedTag,
            xp
        })
    });

    closeModal();
    await loadTasks();
}

/* =========================
   COMPLETE TASKS (FIXED)
========================= */
async function completeSelectedTasks() {

    const selected = document.querySelectorAll(".task-checkbox:checked");

    const taskIds = Array.from(selected).map(cb =>
        parseInt(cb.dataset.id)
    );

    console.log("SELECTED:", taskIds);

    if (taskIds.length === 0) {
        alert("No tasks selected!");
        return;
    }

    try {
        const res = await fetch(`${API}/tasks/complete-batch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: user.id,
                taskIds
            })
        });

        const data = await res.json();
        console.log("SERVER RESPONSE:", data);

        if (!res.ok) {
            alert(data || "Failed to complete tasks");
            return;
        }

        showXP(data.xp || taskIds.length * 10);

        await loadTasks();
        await refreshUser();
        await loadHistory();

    } catch (err) {
        console.error("ERROR:", err);
        alert("Server error while completing tasks");
    }
}


/* =========================
   USER REFRESH
========================= */
async function refreshUser() {
    const res = await fetch(`${API}/user/${user.id}`);
    const updatedUser = await res.json();

    user = updatedUser;
    localStorage.setItem("user", JSON.stringify(updatedUser));

    document.getElementById("xp").innerText = updatedUser.xp;
    document.getElementById("level").innerText = updatedUser.level;
    document.getElementById("name").innerText =
        updatedUser.name || updatedUser.username;

    document.getElementById("classText").innerText =
        "Class: " + (updatedUser.class || "Adventurer");

    document.getElementById("avatar").src =
        "images/" + (updatedUser.avatar || "default.png");

    const percent = updatedUser.xp % 100;
    document.getElementById("xpFill").style.width = percent + "%";

    document.getElementById("xpText").innerText =
        updatedUser.xp + " / 100 XP";
}

/* =========================
   HISTORY
========================= */
async function loadHistory() {
    const res = await fetch(`${API}/tasks/history/${user.id}`);
    const data = await res.json();

    const historyList = document.getElementById("historyList");
    if (!historyList) return;

    historyList.innerHTML = "";

    data.forEach(task => {
        const li = document.createElement("li");

        li.innerHTML = `
            ✔ <strong>${task.title}</strong>
            <small>(${task.type})</small>
        `;

        historyList.appendChild(li);
    });
}

/* =========================
   XP POPUP
========================= */
function showXP(amount) {
    const popup = document.getElementById("xpPopup");
    if (!popup) return;

    popup.innerText = `+${amount} XP`;
    popup.style.display = "block";
    popup.style.opacity = "1";

    setTimeout(() => popup.style.opacity = "0", 600);
    setTimeout(() => popup.style.display = "none", 1000);
}

function testComplete() {
    console.log("🔥 BUTTON CLICKED - FUNCTION WORKS");
    alert("Button works!");
}

/* =========================
   LOGOUT
========================= */
function logout() {
    localStorage.removeItem("user");
    window.location = "login.html";
}

/* =========================
   INIT
========================= */
window.addEventListener("load", () => {
    loadTasks();
    refreshUser();
    loadHistory();
});