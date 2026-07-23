// --- GLOBAL CONSTANTS & CONFIG ---
const API_BASE = window.location.origin;
// Fixed UUID for default university
const DEFAULT_UNI_ID = "a0ea0000-0000-0000-0000-000000000000";

let chartInstance = null; // Store Chart.js instance to prevent memory leaks
let bgGrainient = null; // WebGL shader background instance
let wizardPhotoBase64 = ""; // Base64 string for university profile picture
let loadedLeads = []; // Store currently fetched applications for sorting
let currentAdvantages = []; // Store current university profile advantages (0-3)


// Default student details from user sketch for ease of testing
const SKETCH_STUDENT = {
    fullName: "Староверов Даниил Дмитриевич",
    phone: "",
    ielts: 7.5,
    sat: 1420,
    gpa: 4.8,
    bio: "Увлекаюсь машинным обучением, алгоритмами и разработкой интеллектуальных агентов. Мечтаю исследовать нейросети.",
    achievements: "Призер регионального этапа олимпиады по информатике (2025), диплом за лучший проект на хакатоне AI Hack."
};

// International Country Codes data (Comprehensive World List)
const COUNTRY_CODES = [
    { code: "+998", flag: "🇺🇿", name: "Узбекистан (+998)" },
    { code: "+7", flag: "🇰🇿", name: "Казахстан (+7)" },
    { code: "+7", flag: "🇷🇺", name: "Россия (+7)" },
    { code: "+996", flag: "🇰🇬", name: "Кыргызстан (+996)" },
    { code: "+992", flag: "🇹🇯", name: "Таджикистан (+992)" },
    { code: "+993", flag: "🇹🇲", name: "Туркменистан (+993)" },
    { code: "+90", flag: "🇹🇷", name: "Турция (+90)" },
    { code: "+971", flag: "🇦🇪", name: "ОАЭ (+971)" },
    { code: "+1", flag: "🇺🇸", name: "США (+1)" },
    { code: "+1", flag: "🇨🇦", name: "Канада (+1)" },
    { code: "+44", flag: "🇬🇧", name: "Великобритания (+44)" },
    { code: "+49", flag: "🇩🇪", name: "Германия (+49)" },
    { code: "+33", flag: "🇫🇷", name: "Франция (+33)" },
    { code: "+39", flag: "🇮🇹", name: "Италия (+39)" },
    { code: "+34", flag: "🇪🇸", name: "Испания (+34)" },
    { code: "+82", flag: "🇰🇷", name: "Южная Корея (+82)" },
    { code: "+86", flag: "🇨🇳", name: "Китай (+86)" },
    { code: "+81", flag: "🇯🇵", name: "Япония (+81)" },
    { code: "+91", flag: "🇮🇳", name: "Индия (+91)" },
    { code: "+61", flag: "🇦🇺", name: "Австралия (+61)" },
    { code: "+380", flag: "🇺·🇦", name: "Украина (+380)" },
    { code: "+375", flag: "🇧🇾", name: "Беларусь (+375)" },
    { code: "+374", flag: "🇦🇲", name: "Армения (+374)" },
    { code: "+995", flag: "🇬🇪", name: "Грузия (+995)" },
    { code: "+994", flag: "🇦🇿", name: "Азербайджан (+994)" },
    { code: "+373", flag: "🇲🇩", name: "Молдова (+373)" },
    { code: "+48", flag: "🇵🇱", name: "Польша (+48)" },
    { code: "+420", flag: "🇨🇿", name: "Чехия (+420)" },
    { code: "+43", flag: "🇦🇹", name: "Австрия (+43)" },
    { code: "+41", flag: "🇨🇭", name: "Швейцария (+41)" },
    { code: "+31", flag: "🇳🇱", name: "Нидерланды (+31)" },
    { code: "+32", flag: "🇧🇪", name: "Бельгия (+32)" },
    { code: "+46", flag: "🇸🇪", name: "Швеция (+46)" },
    { code: "+47", flag: "🇳🇴", name: "Норвегия (+47)" },
    { code: "+358", flag: "🇫🇮", name: "Финляндия (+358)" },
    { code: "+966", flag: "🇸🇦", name: "Саудовская Аравия (+966)" },
    { code: "+974", flag: "🇶🇦", name: "Катар (+974)" },
    { code: "+965", flag: "🇰🇼", name: "Кувейт (+965)" },
    { code: "+20", flag: "🇪🇬", name: "Египет (+20)" },
    { code: "+62", flag: "🇮🇩", name: "Индонезия (+62)" },
    { code: "+60", flag: "🇲🇾", name: "Малайзия (+60)" },
    { code: "+65", flag: "🇸🇬", name: "Сингапур (+65)" },
    { code: "+66", flag: "🇹🇭", name: "Таиланд (+66)" },
    { code: "+84", flag: "🇻🇳", name: "Вьетнам (+84)" },
    { code: "+55", flag: "🇧🇷", name: "Бразилия (+55)" },
    { code: "+52", flag: "🇲🇽", name: "Мексика (+52)" },
    { code: "+27", flag: "🇿🇦", name: "ЮАР (+27)" }
];

// Detect User's Default Country Code by TimeZone or Geolocation
function detectDefaultCountryCode() {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        if (tz.includes("Tashkent") || tz.includes("Samarkand")) return "+998";
        if (tz.includes("Almaty") || tz.includes("Qostanay") || tz.includes("Aqtobe")) return "+7";
        if (tz.includes("Bishkek")) return "+996";
        if (tz.includes("Dushanbe")) return "+992";
        if (tz.includes("Ashgabat")) return "+993";
        if (tz.includes("Moscow") || tz.includes("Yekaterinburg")) return "+7";
        if (tz.includes("Istanbul")) return "+90";
    } catch(e) {}
    return "+998"; // Default fallback to Uzbekistan (+998)
}

function setupPhoneInputs() {
    const phoneInputs = [
        document.getElementById("onboard-val-phone"),
        document.getElementById("onboard-login-phone"),
        document.getElementById("form-phone"),
        document.getElementById("quick-apply-phone"),
        document.getElementById("auth-phone-input")
    ];

    phoneInputs.forEach(input => {
        if (!input) return;
        input.placeholder = "Ваш номер телефона";
        input.type = "tel";
    });
}

// --- DOM READY INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    // Initialize Theme from localStorage
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-theme");
    }
    
    // Initialize WebGL shader background
    initBackground();

    // Setup phone input placeholders
    setupPhoneInputs();

    // Initialize AI Career Orientation Widget
    initAIOrientation();

    // Router setup
    window.addEventListener("hashchange", handleRoute);
    handleRoute();

    // Init Lucide icons initially
    lucide.createIcons();

    // Initialize student session & check onboarding
    initStudentSession();

    // Setup Event Listeners
    setupEventListeners();

    // Load initial data
    loadUniversities();
});

// --- ROUTER SYSTEM ---
function handleRoute() {
    const hash = window.location.hash.substring(1) || "home";
    let page = hash;
    let param = null;

    if (hash.startsWith("university/")) {
        page = "university";
        param = hash.split("/")[1];
    }

    // Hide all sections first
    document.querySelectorAll(".page-section").forEach(sec => {
        sec.classList.remove("active");
    });


    // Update Nav links active state
    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.remove("active");
        if (link.getAttribute("data-page") === page) {
            link.classList.add("active");
        }
    });

    // Load specific pages
    if (page === "home") {
        document.getElementById("page-home").classList.add("active");
        loadUniversities();
    } else if (page === "university" && param) {
        document.getElementById("page-university").classList.add("active");
        loadUniversityDetails(param);
    } else if (page === "profile") {
        document.getElementById("page-profile").classList.add("active");
        const savedPhone = localStorage.getItem("currentStudentPhone");
        if (savedPhone) {
            loadStudentProfile(savedPhone, false); // load silently
        } else {
            resetPassportCard("");
        }
    } else if (page === "partner") {
        document.getElementById("page-partner").classList.add("active");
        renderPartnerCabinet();
    } else {
        // Fallback to home
        window.location.hash = "home";
    }

    // Re-trigger icon rendering
    setTimeout(() => lucide.createIcons(), 50);
}

// Helper to show modal notification toasts
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type === "danger" ? "toast-danger" : ""}`;
    
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close"><i data-lucide="x"></i></button>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();

    // Close on click
    toast.querySelector(".toast-close").addEventListener("click", () => {
        toast.remove();
    });

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 5000);
}

// Prefill form with default values from user's sketch
function prefillStudentForm() {
    document.getElementById("form-fullname").value = SKETCH_STUDENT.fullName;
    document.getElementById("form-phone").value = SKETCH_STUDENT.phone;
    document.getElementById("form-ielts").value = SKETCH_STUDENT.ielts;
    document.getElementById("form-sat").value = SKETCH_STUDENT.sat;
    document.getElementById("form-gpa").value = SKETCH_STUDENT.gpa;
    document.getElementById("form-bio").value = SKETCH_STUDENT.bio;
    document.getElementById("form-achievements").value = SKETCH_STUDENT.achievements;
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    // Theme Toggle listener
    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
        // Set initial icon based on body class
        const icon = themeToggle.querySelector("i");
        if (document.body.classList.contains("dark-theme") && icon) {
            icon.setAttribute("data-lucide", "sun");
        }

        themeToggle.addEventListener("click", () => {
            document.body.classList.toggle("dark-theme");
            const isDark = document.body.classList.contains("dark-theme");
            localStorage.setItem("theme", isDark ? "dark" : "light");

            const icon = themeToggle.querySelector("i");
            if (icon) {
                if (isDark) {
                    icon.setAttribute("data-lucide", "sun");
                } else {
                    icon.setAttribute("data-lucide", "moon");
                }
            }
            lucide.createIcons();

            if (chartInstance) {
                updateChartColors(isDark);
            }

            if (bgGrainient) {
                bgGrainient.updateUniforms(isDark ? {
                    color1: "#ff9ffc",
                    color2: "#5227ff",
                    color3: "#b497cf",
                    timeSpeed: 0.2,
                    zoom: 0.65,
                    grainAmount: 0.08,
                    contrast: 1.4,
                    saturation: 1.0,
                    warpStrength: 1.0,
                    warpFrequency: 6.1,
                    warpSpeed: 2.3,
                    warpAmplitude: 50.0
                } : {
                    color1: "#ffbbf8",
                    color2: "#a08cff",
                    color3: "#d5c2ff",
                    timeSpeed: 0.15,
                    zoom: 0.65,
                    grainAmount: 0.05,
                    contrast: 1.35,
                    saturation: 1.3,
                    warpStrength: 0.8,
                    warpFrequency: 5.0,
                    warpSpeed: 1.8,
                    warpAmplitude: 40.0
                });
            }
        });
    }

    // Navigation hooks
    document.getElementById("logo-btn").addEventListener("click", (e) => {
        e.preventDefault();
        window.location.hash = "home";
    });
    
    document.getElementById("header-profile-btn").addEventListener("click", () => {
        window.location.hash = "profile";
    });

    document.getElementById("back-to-home-btn").addEventListener("click", () => {
        window.location.hash = "home";
    });

    document.getElementById("footer-partner-link").addEventListener("click", (e) => {
        e.preventDefault();
        window.location.hash = "partner";
    });

    // File input changes preview UI
    const fileInput = document.getElementById("form-file");
    fileInput.addEventListener("change", (e) => {
        const preview = document.getElementById("file-name-preview");
        if (e.target.files.length > 0) {
            preview.textContent = `Выбран: ${e.target.files[0].name}`;
            preview.style.color = "#10B981";
        } else {
            preview.textContent = "Файл не выбран";
            preview.style.color = "";
        }
    });

    // Live Search and Filters Binding
    const searchBtn = document.getElementById("search-btn");
    const searchInput = document.getElementById("search-input");
    const priceSlider = document.getElementById("filter-price-slider");
    const priceMaxDisplay = document.getElementById("price-max-val");
    const resetFilterBtn = document.getElementById("filter-reset-btn");

    const grantToggle = document.getElementById("filter-grant-toggle");
    const scholarshipToggle = document.getElementById("filter-scholarship-toggle");
    const directionSelect = document.getElementById("filter-direction");
    const uniTypeSelect = document.getElementById("filter-uni-type");
    const formatSelect = document.getElementById("filter-format");
    const langSelect = document.getElementById("filter-language");

    if (searchBtn) searchBtn.addEventListener("click", applyUniversityFilters);
    if (searchInput) {
        searchInput.addEventListener("input", applyUniversityFilters);
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                applyUniversityFilters();
            }
        });
    }

    if (priceSlider && priceMaxDisplay) {
        priceSlider.addEventListener("input", () => {
            const formatted = Number(priceSlider.value).toLocaleString("ru-RU") + " сум";
            priceMaxDisplay.textContent = formatted;
            applyUniversityFilters();
        });
    }

    if (grantToggle) grantToggle.addEventListener("change", applyUniversityFilters);
    const sortSelect = document.getElementById("filter-sort");
    if (sortSelect) sortSelect.addEventListener("change", applyUniversityFilters);
    if (grantToggle) grantToggle.addEventListener("change", applyUniversityFilters);
    if (scholarshipToggle) scholarshipToggle.addEventListener("change", applyUniversityFilters);
    if (directionSelect) directionSelect.addEventListener("change", applyUniversityFilters);
    if (uniTypeSelect) uniTypeSelect.addEventListener("change", applyUniversityFilters);
    if (formatSelect) formatSelect.addEventListener("change", applyUniversityFilters);
    if (langSelect) langSelect.addEventListener("change", applyUniversityFilters);

    if (resetFilterBtn) {
        resetFilterBtn.addEventListener("click", () => {
            if (priceSlider) {
                priceSlider.value = 135000000;
                priceMaxDisplay.textContent = "135 000 000 сум";
            }
            if (searchInput) searchInput.value = "";
            if (grantToggle) grantToggle.checked = false;
            if (scholarshipToggle) scholarshipToggle.checked = false;
            if (sortSelect) sortSelect.value = "default";
            if (directionSelect) directionSelect.value = "all";
            if (uniTypeSelect) uniTypeSelect.value = "all";
            if (formatSelect) formatSelect.value = "all";
            if (langSelect) langSelect.value = "all";

            applyUniversityFilters();
            showToast("Параметры фильтра сброшены", "info");
        });
    }

    // Search filter dropdown toggle
    const filterBtn = document.getElementById("filter-btn");
    const filterMenu = document.getElementById("filter-menu");
    filterBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        filterMenu.classList.toggle("show");
    });
    
    document.addEventListener("click", () => {
        filterMenu.classList.remove("show");
    });
    
    filterMenu.addEventListener("click", (e) => {
        e.stopPropagation();
    });

    // Quick Apply Modal Close Listeners
    const closeApplyModalBtn = document.getElementById("close-apply-modal-btn");
    if (closeApplyModalBtn) {
        closeApplyModalBtn.addEventListener("click", closeQuickApplyModal);
    }

    const quickModalOverlay = document.getElementById("quick-apply-modal");
    if (quickModalOverlay) {
        quickModalOverlay.addEventListener("click", (e) => {
            if (e.target === quickModalOverlay) {
                closeQuickApplyModal();
            }
        });
    }

    // Lead Student Profile Modal Close Listeners
    const closeLeadModalBtn = document.getElementById("close-lead-modal-btn");
    if (closeLeadModalBtn) {
        closeLeadModalBtn.addEventListener("click", closeLeadStudentModal);
    }

    const leadModalOverlay = document.getElementById("student-profile-modal");
    if (leadModalOverlay) {
        leadModalOverlay.addEventListener("click", (e) => {
            if (e.target === leadModalOverlay) {
                closeLeadStudentModal();
            }
        });
    }

    // Quick Apply File Name Preview
    const quickFileInput = document.getElementById("quick-apply-file");
    const quickFilePreview = document.getElementById("quick-file-name-preview");
    if (quickFileInput && quickFilePreview) {
        quickFileInput.addEventListener("change", () => {
            const file = quickFileInput.files[0];
            if (file) {
                quickFilePreview.textContent = `✓ Выбран: ${file.name}`;
                quickFilePreview.style.color = "var(--primary)";
            } else {
                quickFilePreview.textContent = "Файл не выбран";
                quickFilePreview.style.color = "";
            }
        });
    }

    // Quick Apply Form Submit Handler
    const quickApplyForm = document.getElementById("quick-apply-form");
    if (quickApplyForm) {
        quickApplyForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const uniId = document.getElementById("quick-apply-uni-id").value;
            const specId = document.getElementById("quick-apply-spec").value;
            const fullName = document.getElementById("quick-apply-name").value;
            const phone = document.getElementById("quick-apply-phone").value;
            const ielts = document.getElementById("quick-apply-ielts").value;
            const gpa = document.getElementById("quick-apply-gpa").value;
            const file = document.getElementById("quick-apply-file").files[0];
            const uniName = document.getElementById("apply-modal-uni-name").textContent;

            const submitBtn = document.getElementById("quick-apply-submit-btn");
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i data-lucide="loader" class="btn-icon animate-spin"></i> Передача документов...`;
            lucide.createIcons();

            if (!specId) {
                showToast("Пожалуйста, выберите направление из списка", "danger");
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<i data-lucide="send" class="btn-icon"></i>Отправить документы в ВУЗ`;
                return;
            }

            if (!file) {
                showToast("Пожалуйста, прикрепите скан аттестата или паспорта", "danger");
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<i data-lucide="send" class="btn-icon"></i>Отправить документы в ВУЗ`;
                return;
            }

            const appTypeElem = document.getElementById("quick-apply-app-type");
            const appType = appTypeElem ? appTypeElem.value : "standard";

            const formData = new FormData();
            formData.append("university_id", uniId);
            formData.append("specialty_id", specId);
            formData.append("full_name", fullName);
            formData.append("phone", phone);
            formData.append("app_type", appType);
            if (ielts) formData.append("ielts_score", ielts);
            if (gpa) formData.append("gpa", gpa);
            formData.append("file", file);

            try {
                const res = await fetch(`${API_BASE}/api/v1/applications/apply`, {
                    method: "POST",
                    body: formData
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.detail || "Ошибка при отправке документов");
                }

                localStorage.setItem("currentStudentName", fullName);
                localStorage.setItem("currentStudentPhone", phone);

                showToast(`🎉 Заявка успешно отправлена в ${uniName}!`, "success");
                closeQuickApplyModal();

                const profilePage = document.getElementById("page-profile");
                if (profilePage && profilePage.classList.contains("active")) {
                    loadStudentProfile(phone);
                }

            } catch (err) {
                console.error("Error quick applying:", err);
                showToast(err.message || "Не удалось отправить документы", "danger");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<i data-lucide="send" class="btn-icon"></i>Отправить документы в ВУЗ`;
                lucide.createIcons();
            }
        });
    }

    // Authorization in passport view
    document.getElementById("load-profile-btn").addEventListener("click", () => {
        const phone = document.getElementById("auth-phone-input").value;
        if (!phone.trim()) {
            showToast("Пожалуйста, введите телефон для загрузки профиля", "danger");
            return;
        }
        loadStudentProfile(phone, true);
    });

    // Student Logout Button
    const studentLogoutBtn = document.getElementById("student-logout-btn");
    if (studentLogoutBtn) {
        studentLogoutBtn.addEventListener("click", () => {
            localStorage.removeItem("currentStudentPhone");
            resetPassportCard("");
            document.getElementById("auth-phone-input").value = "";
            showToast("Вы вышли из профиля", "success");
            showOnboardingOverlay();
        });
    }

    // Global Logout Button in Header
    const globalLogoutBtn = document.getElementById("global-logout-btn");
    if (globalLogoutBtn) {
        globalLogoutBtn.addEventListener("click", () => {
            localStorage.removeItem("currentStudentPhone");
            resetPassportCard("");
            document.getElementById("auth-phone-input").value = "";
            showToast("Вы вышли из профиля", "success");
            showOnboardingOverlay();
        });
    }

    // Logout Button at the bottom of the profile page
    const profileLogoutBtn = document.getElementById("profile-logout-btn");
    if (profileLogoutBtn) {
        profileLogoutBtn.addEventListener("click", () => {
            localStorage.removeItem("currentStudentPhone");
            resetPassportCard("");
            document.getElementById("auth-phone-input").value = "";
            showToast("Вы вышли из профиля", "success");
            showOnboardingOverlay();
        });
    }

    // Onboarding Login Trigger
    const onboardLoginTrigger = document.getElementById("onboard-login-trigger");
    if (onboardLoginTrigger) {
        onboardLoginTrigger.addEventListener("click", () => {
            document.getElementById("onboard-step-1").classList.remove("active");
            document.getElementById("onboard-step-login").classList.add("active");
            updateStepper('login');
        });
    }

    // Onboarding Login Back Button
    const onboardLoginBackBtn = document.getElementById("onboard-login-back-btn");
    if (onboardLoginBackBtn) {
        onboardLoginBackBtn.addEventListener("click", () => {
            document.getElementById("onboard-step-login").classList.remove("active");
            document.getElementById("onboard-step-1").classList.add("active");
            updateStepper(1);
        });
    }

    // Onboarding Login Submit Button
    const onboardLoginSubmitBtn = document.getElementById("onboard-login-submit-btn");
    if (onboardLoginSubmitBtn) {
        onboardLoginSubmitBtn.addEventListener("click", async () => {
            const phone = document.getElementById("onboard-login-phone").value.trim();
            if (!phone) {
                showToast("Пожалуйста, введите номер телефона", "danger");
                return;
            }

            try {
                const encodedPhone = encodeURIComponent(phone);
                const res = await fetch(`${API_BASE}/api/v1/students/${encodedPhone}/profile`);
                
                if (res.status === 404) {
                    showToast("Профиль с таким номером телефона не найден", "danger");
                    return;
                }
                if (!res.ok) throw new Error("Ошибка сервера");
                
                showToast("Успешный вход в аккаунт!", "success");
                
                localStorage.setItem("currentStudentPhone", phone);
                document.getElementById("auth-phone-input").value = phone;
                
                await loadStudentProfile(phone, false);
                hideOnboardingOverlay();
                
                // Route to profile tab
                window.location.hash = "profile";
            } catch (err) {
                showToast(err.message || "Не удалось войти в аккаунт", "danger");
            }
        });
    }

    // Relaunch Onboarding Button
    const relaunchOnboardBtn = document.getElementById("relaunch-onboarding-btn");
    if (relaunchOnboardBtn) {
        relaunchOnboardBtn.addEventListener("click", () => {
            showOnboardingOverlay();
        });
    }

    // Onboarding Step 1 Event Listeners
    const onboardStartBtn = document.getElementById("onboard-start-btn");
    if (onboardStartBtn) {
        onboardStartBtn.addEventListener("click", () => {
            document.getElementById("onboard-step-1").classList.remove("active");
            document.getElementById("onboard-step-2").classList.add("active");
            updateStepper(2);
        });
    }

    const onboardSkip1Btn = document.getElementById("onboard-skip-1-btn");
    if (onboardSkip1Btn) {
        onboardSkip1Btn.addEventListener("click", () => {
            hideOnboardingOverlay();
        });
    }

    // Onboarding Step 2 Event Listeners (Personal Info - Mandatory)
    const onboardNext2Btn = document.getElementById("onboard-next-2-btn");
    if (onboardNext2Btn) {
        onboardNext2Btn.addEventListener("click", () => {
            const name = document.getElementById("onboard-val-name").value.trim();
            const birthday = document.getElementById("onboard-val-birthday").value;
            const phone = document.getElementById("onboard-val-phone").value.trim();

            if (!name || !birthday || !phone) {
                showToast("Пожалуйста, укажите ваши ФИО, дату рождения и номер телефона", "danger");
                return;
            }

            document.getElementById("onboard-step-2").classList.remove("active");
            document.getElementById("onboard-step-3").classList.add("active");
            updateStepper(3);
        });
    }

    const onboardSkip3Btn = document.getElementById("onboard-skip-3-btn");
    if (onboardSkip3Btn) {
        onboardSkip3Btn.addEventListener("click", () => {
            document.getElementById("onboard-val-ielts").value = "";
            document.getElementById("onboard-val-sat").value = "";
            document.getElementById("onboard-val-gpa").value = "";
            
            const finalForm = document.getElementById("onboard-final-form");
            if (finalForm) {
                finalForm.requestSubmit();
            }
        });
    }

    // Onboarding Step 2 Back Button
    const onboardPrev2Btn = document.getElementById("onboard-prev-2-btn");
    if (onboardPrev2Btn) {
        onboardPrev2Btn.addEventListener("click", () => {
            document.getElementById("onboard-step-2").classList.remove("active");
            document.getElementById("onboard-step-1").classList.add("active");
            updateStepper(1);
        });
    }

    // Onboarding Step 3 Back Button
    const onboardPrev3Btn = document.getElementById("onboard-prev-3-btn");
    if (onboardPrev3Btn) {
        onboardPrev3Btn.addEventListener("click", () => {
            document.getElementById("onboard-step-3").classList.remove("active");
            document.getElementById("onboard-step-2").classList.add("active");
            updateStepper(2);
        });
    }

    // Onboarding Step 3 final submit form
    const onboardFinalForm = document.getElementById("onboard-final-form");
    if (onboardFinalForm) {
        onboardFinalForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const name = document.getElementById("onboard-val-name").value.trim();
            const birthday = document.getElementById("onboard-val-birthday").value;
            const phone = document.getElementById("onboard-val-phone").value.trim();
            
            const ielts = document.getElementById("onboard-val-ielts").value;
            const sat = document.getElementById("onboard-val-sat").value;
            const gpa = document.getElementById("onboard-val-gpa").value;

            if (!name || !birthday || !phone) {
                showToast("Пожалуйста, заполните ФИО, дату рождения и номер телефона", "danger");
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/api/v1/students/profile`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        full_name: name,
                        phone: phone,
                        birthday: birthday,
                        gpa: gpa ? parseFloat(gpa) : null,
                        ielts_score: ielts ? parseFloat(ielts) : null,
                        sat_score: sat ? parseInt(sat) : null
                    })
                });

                if (!res.ok) throw new Error("Не удалось создать профиль");
                const data = await res.json();
                
                showToast("Ваш профиль успешно создан!", "success");
                
                localStorage.setItem("currentStudentPhone", phone);
                document.getElementById("auth-phone-input").value = phone;
                
                await loadStudentProfile(phone, false);
                hideOnboardingOverlay();
                
                // Route to profile tab
                window.location.hash = "profile";
            } catch (err) {
                showToast(err.message || "Ошибка создания профиля", "danger");
            }
        });
    }

    // Dropdown Specialty binding based on University selection
    const uniSelect = document.getElementById("form-university");
    if (uniSelect) {
        uniSelect.addEventListener("change", (e) => {
            const uniId = e.target.value;
            loadSpecialtiesForForm(uniId);
            updateProfileFormUI();
        });
    }

    const specSelect = document.getElementById("form-specialty");
    if (specSelect) {
        specSelect.addEventListener("change", () => {
            updateProfileFormUI();
        });
    }

    // Student Application Form submission
    const applyForm = document.getElementById("apply-form");
    applyForm.addEventListener("submit", handleApplicationSubmit);

    // Auth Tab toggles
    const tabLoginBtn = document.getElementById("tab-login-btn");
    const tabSignupBtn = document.getElementById("tab-signup-btn");
    const loginView = document.getElementById("partner-login-view");
    const signupView = document.getElementById("partner-signup-view");

    if (tabLoginBtn && tabSignupBtn) {
        tabLoginBtn.addEventListener("click", () => {
            tabLoginBtn.style.borderColor = "var(--primary)";
            tabLoginBtn.style.background = "rgba(102, 2, 60, 0.03)";
            tabSignupBtn.style.borderColor = "";
            tabSignupBtn.style.background = "";
            loginView.style.display = "block";
            signupView.style.display = "none";
        });

        tabSignupBtn.addEventListener("click", () => {
            tabSignupBtn.style.borderColor = "var(--primary)";
            tabSignupBtn.style.background = "rgba(102, 2, 60, 0.03)";
            tabLoginBtn.style.borderColor = "";
            tabLoginBtn.style.background = "";
            loginView.style.display = "none";
            signupView.style.display = "block";
        });
    }

    // Login Form Submit
    const loginForm = document.getElementById("partner-login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", handlePartnerLoginSubmit);
    }

    // Sign Up Form Submit
    const signupForm = document.getElementById("partner-signup-form");
    if (signupForm) {
        signupForm.addEventListener("submit", handlePartnerSignupSubmit);
    }

    // Logout button
    const logoutBtn = document.getElementById("partner-logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("currentPartner");
            renderPartnerCabinet();
            showToast("Вы вышли из личного кабинета", "success");
        });
    }

    // Start Wizard button
    const startWizardBtn = document.getElementById("start-wizard-btn");
    if (startWizardBtn) {
        startWizardBtn.addEventListener("click", () => {
            openWizard(false); // false = new profile
        });
    }

    // Edit profile button
    const editProfileBtn = document.getElementById("dash-edit-profile-btn");
    if (editProfileBtn) {
        editProfileBtn.addEventListener("click", () => {
            openWizard(true); // true = edit
        });
    }

    // Partner Settings button & modal
    const dashSettingsBtn = document.getElementById("dash-settings-btn");
    const settingsModal = document.getElementById("partner-settings-modal");
    const closeSettingsBtn = document.getElementById("close-partner-settings-btn");
    const cancelSettingsBtn = document.getElementById("cancel-partner-settings-btn");
    const settingsForm = document.getElementById("partner-settings-form");

    if (dashSettingsBtn && settingsModal) {
        dashSettingsBtn.addEventListener("click", () => {
            if (myUniversity) {
                document.getElementById("settings-accepted-msg").value = myUniversity.accepted_message || myUniversity.contact_info || "";
                document.getElementById("settings-rejected-msg").value = myUniversity.rejected_message || "";
                document.getElementById("settings-admissions-phone").value = myUniversity.admissions_phone || "";
            }
            settingsModal.style.display = "flex";
            setTimeout(() => settingsModal.classList.add("show"), 10);
        });
    }

    const closeSettings = () => {
        if (!settingsModal) return;
        settingsModal.classList.remove("show");
        setTimeout(() => settingsModal.style.display = "none", 200);
    };

    if (closeSettingsBtn) closeSettingsBtn.onclick = closeSettings;
    if (cancelSettingsBtn) cancelSettingsBtn.onclick = closeSettings;

    if (settingsForm) {
        settingsForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!myUniversity) return;

            const accMsg = document.getElementById("settings-accepted-msg").value.trim();
            const rejMsg = document.getElementById("settings-rejected-msg").value.trim();
            const phone = document.getElementById("settings-admissions-phone").value.trim();

            try {
                const res = await fetch(`${API_BASE}/api/v1/universities/settings`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        university_id: myUniversity.id,
                        accepted_message: accMsg,
                        rejected_message: rejMsg,
                        admissions_phone: phone
                    })
                });
                if (!res.ok) throw new Error("Failed to save settings");
                
                myUniversity.accepted_message = accMsg;
                myUniversity.rejected_message = rejMsg;
                myUniversity.admissions_phone = phone;

                showToast("Настройки сообщений приёмной комиссии сохранены!", "success");
                closeSettings();
            } catch (err) {
                showToast("Не удалось сохранить настройки", "danger");
            }
        });
    }

    // Refresh Dashboard button
    const refreshDashBtn = document.getElementById("refresh-dash-data-btn");
    if (refreshDashBtn) {
        refreshDashBtn.addEventListener("click", () => {
            if (myUniversity) {
                loadPartnerDashboardData(myUniversity.id);
                showToast("Данные дашборда обновлены", "success");
            }
        });
    }

    // Wizard navigation controls
    const wizardNextBtn = document.getElementById("wizard-next-btn");
    if (wizardNextBtn) {
        wizardNextBtn.addEventListener("click", () => {
            const name = document.getElementById("wizard-name").value.trim();
            const country = document.getElementById("wizard-country").value.trim();
            const city = document.getElementById("wizard-city").value.trim();
            const desc = document.getElementById("wizard-description").value.trim();
            
            if (!name || !country || !city || !desc) {
                showToast("Пожалуйста, заполните все обязательные поля шага 1", "danger");
                return;
            }
            
            document.getElementById("wizard-step-1").style.display = "none";
            document.getElementById("wizard-step-2").style.display = "block";
            document.getElementById("partner-step-ind-1").style.color = "var(--text-muted)";
            document.getElementById("partner-step-ind-2").style.color = "var(--primary)";
        });
    }

    const wizardPrevBtn = document.getElementById("wizard-prev-btn");
    if (wizardPrevBtn) {
        wizardPrevBtn.addEventListener("click", () => {
            document.getElementById("wizard-step-1").style.display = "block";
            document.getElementById("wizard-step-2").style.display = "none";
            document.getElementById("partner-step-ind-1").style.color = "var(--primary)";
            document.getElementById("partner-step-ind-2").style.color = "var(--text-muted)";
        });
    }

    const wizardAddSpecBtn = document.getElementById("wizard-add-spec-btn");
    if (wizardAddSpecBtn) {
        wizardAddSpecBtn.addEventListener("click", () => {
            addSpecialtyRow();
        });
    }

    const wizardSubmitBtn = document.getElementById("wizard-submit-btn");
    if (wizardSubmitBtn) {
        wizardSubmitBtn.addEventListener("click", handleWizardSubmit);
    }

    // Live Preview sync listener
    const wizardForm = document.getElementById("wizard-form");
    if (wizardForm) {
        wizardForm.addEventListener("input", syncWizardLivePreview);
    }

    const closePreviewBtn = document.getElementById("close-wb-preview-btn");
    const previewModal = document.getElementById("wb-preview-modal");
    if (closePreviewBtn && previewModal) {
        closePreviewBtn.addEventListener("click", () => {
            previewModal.style.display = "none";
        });
        previewModal.addEventListener("click", (e) => {
            if (e.target === previewModal) {
                previewModal.style.display = "none";
            }
        });
    }

    // Active Dashboard Live Preview (Student Eyes)
    const dashPreviewBtn = document.getElementById("dash-preview-profile-btn");
    if (dashPreviewBtn) {
        dashPreviewBtn.addEventListener("click", () => {
            if (myUniversity) {
                window.location.hash = `university/${myUniversity.id}`;
            }
        });
    }
    // Dashboard search lead table
    const tableSearch = document.getElementById("table-search-input");
    if (tableSearch) {
        tableSearch.addEventListener("input", () => {
            renderLeadsTable();
        });
    }

    // Wizard Photo Upload
    const wizardPhotoInput = document.getElementById("wizard-photo");
    const wizardPhotoPreviewContainer = document.getElementById("wizard-photo-preview-container");
    const wizardPhotoPreview = document.getElementById("wizard-photo-preview");
    const wizardPhotoRemoveBtn = document.getElementById("wizard-photo-remove-btn");

    if (wizardPhotoInput) {
        wizardPhotoInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                wizardPhotoBase64 = event.target.result;
                if (wizardPhotoPreview) wizardPhotoPreview.src = wizardPhotoBase64;
                if (wizardPhotoPreviewContainer) wizardPhotoPreviewContainer.style.display = "flex";
                syncWizardLivePreview();
            };
            reader.readAsDataURL(file);
        });
    }

    if (wizardPhotoRemoveBtn) {
        wizardPhotoRemoveBtn.addEventListener("click", () => {
            wizardPhotoBase64 = "";
            if (wizardPhotoInput) wizardPhotoInput.value = "";
            if (wizardPhotoPreviewContainer) wizardPhotoPreviewContainer.style.display = "none";
            if (wizardPhotoPreview) wizardPhotoPreview.src = "";
            syncWizardLivePreview();
        });
    }

    // Wizard Cancel Buttons
    document.querySelectorAll(".wizard-cancel-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.getElementById("partner-wizard-view").style.display = "none";
            renderPartnerCabinet();
        });
    });
    // Leads Sort Select Event Listener
    const leadsSortSelect = document.getElementById("leads-sort-select");
    if (leadsSortSelect) {
        leadsSortSelect.addEventListener("change", () => {
            renderLeadsTable();
        });
    }

    // Back to Home Button Bindings
    document.querySelectorAll(".back-to-home-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            window.location.hash = "home";
        });
    });

    // Add Advantage Button Handler
    const addAdvBtn = document.getElementById("wizard-add-adv-btn");
    if (addAdvBtn) {
        addAdvBtn.addEventListener("click", () => {
            if (currentAdvantages.length < 3) {
                currentAdvantages.push({ title: "", desc: "" });
                renderWizardAdvantages();
                syncWizardLivePreview();
            }
        });
    }

    // Toggle Grant & Scholarship Boxes in Wizard
    const toggleGrantBtn = document.getElementById("wizard-toggle-grant-btn");
    const grantBox = document.getElementById("wizard-grant-box");
    if (toggleGrantBtn && grantBox) {
        toggleGrantBtn.addEventListener("click", () => {
            grantBox.style.display = (grantBox.style.display === "none") ? "block" : "none";
            const input = document.getElementById("wizard-grant-info");
            if (grantBox.style.display === "block" && input) input.focus();
        });
    }

    const toggleScholarshipBtn = document.getElementById("wizard-toggle-scholarship-btn");
    const scholarshipBox = document.getElementById("wizard-scholarship-box");
    if (toggleScholarshipBtn && scholarshipBox) {
        toggleScholarshipBtn.addEventListener("click", () => {
            scholarshipBox.style.display = (scholarshipBox.style.display === "none") ? "block" : "none";
            const input = document.getElementById("wizard-scholarship-info");
            if (scholarshipBox.style.display === "block" && input) input.focus();
        });
    }

}

// --- DATA LOADING & INTERACTION FUNCTIONS ---

// 1. Load approved universities for student feed
// 1. Load approved universities for student feed
async function loadUniversities() {
    try {
        const res = await fetch(`${API_BASE}/api/v1/universities`);
        if (!res.ok) throw new Error("Failed to load");
        
        const list = await res.json();
        window.rawUniversitiesList = list;
        populateUniversityDropdowns(list);
        applyUniversityFilters();

    } catch (err) {
        console.error("Error loading universities:", err);
    }
}

// 1b. Apply Live Filters & Search
function applyUniversityFilters() {
    if (!window.rawUniversitiesList) return;

    const queryInput = document.getElementById("search-input");
    const query = queryInput ? queryInput.value.toLowerCase().trim() : "";

    const priceSlider = document.getElementById("filter-price-slider");
    const maxPrice = priceSlider ? Number(priceSlider.value) : Infinity;

    const grantToggle = document.getElementById("filter-grant-toggle");
    const requireGrant = grantToggle ? grantToggle.checked : false;

    const scholarshipToggle = document.getElementById("filter-scholarship-toggle");
    const requireScholarship = scholarshipToggle ? scholarshipToggle.checked : false;

    const directionSelect = document.getElementById("filter-direction");
    const direction = directionSelect ? directionSelect.value : "all";

    const uniTypeSelect = document.getElementById("filter-uni-type");
    const uniType = uniTypeSelect ? uniTypeSelect.value : "all";

    const formatSelect = document.getElementById("filter-format");
    const format = formatSelect ? formatSelect.value : "all";

    const langSelect = document.getElementById("filter-language");
    const lang = langSelect ? langSelect.value : "all";

    const filtered = window.rawUniversitiesList.filter(uni => {
        // Search query filter (matches name, city, country, description)
        if (query) {
            const nameMatch = uni.name && uni.name.toLowerCase().includes(query);
            const cityMatch = uni.city && uni.city.toLowerCase().includes(query);
            const countryMatch = uni.country && uni.country.toLowerCase().includes(query);
            const descMatch = uni.description && uni.description.toLowerCase().includes(query);
            if (!nameMatch && !cityMatch && !countryMatch && !descMatch) {
                return false;
            }
        }

        // Grant filter
        if (requireGrant && !uni.has_grant && uni.status !== "approved") {
            return false;
        }

        // Scholarship filter
        if (requireScholarship && !uni.has_scholarship) {
            return false;
        }

        // University Type filter
        if (uniType !== "all" && uni.type && uni.type !== uniType) {
            return false;
        }

        // Contract price slider filter
        if (uni.contract_price && Number(uni.contract_price) > maxPrice) {
            return false;
        }

        return true;
    });

    const sortSelect = document.getElementById("filter-sort");
    const sortMode = sortSelect ? sortSelect.value : "default";

    if (sortMode === "price_asc") {
        filtered.sort((a, b) => (Number(a.contract_price) || 0) - (Number(b.contract_price) || 0));
    } else if (sortMode === "price_desc") {
        filtered.sort((a, b) => (Number(b.contract_price) || 0) - (Number(a.contract_price) || 0));
    }

    renderUniversityCards(filtered);
}

// 1c. Render Cards Grid
function renderUniversityCards(list) {
    const container = document.getElementById("uni-list-container");
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = `
            <div class="glass-card" style="text-align: center; padding: 3rem; color: var(--text-secondary); width: 100%; grid-column: 1 / -1;">
                <i data-lucide="search-x" style="width:44px; height:44px; color: var(--primary); margin-bottom: 1rem;"></i>
                <h3 style="font-family: var(--font-heading); font-size: 1.4rem; color: var(--primary); margin-bottom: 0.5rem;">Ничего не найдено</h3>
                <p style="font-size: 0.95rem;">По вашему запросу и выбранным фильтрам не найдено совпадений. Попробуйте сбросить фильтры.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    container.innerHTML = "";
    list.forEach(uni => {
        const card = document.createElement("div");
        card.className = "uni-card glass-card";
        
        const isDefault = uni.id === DEFAULT_UNI_ID;
        const alias = uni.name.split(" ").map(w => w[0]).join("").substring(0, 4);

        const hasPhoto = uni.photo && uni.photo.startsWith("data:image/");
        const placeholderStyle = hasPhoto 
            ? `background-image: url('${uni.photo}'); background-size: cover; background-position: center; border-bottom: 1px solid var(--card-border);`
            : `background: var(--bg-accent); border-bottom: 1px solid var(--card-border);`;

        card.innerHTML = `
            <div class="uni-card-img-placeholder" style="${placeholderStyle}">
                <div class="uni-card-tag" style="background: var(--primary); color: var(--bg);">${isDefault ? 'ТОП ВУЗ' : 'ПАРТНЕР'}</div>
                ${hasPhoto ? '' : `<span class="uni-card-alias" style="color: var(--text-muted);">${alias}</span>`}
            </div>
            <div class="uni-card-body">
                <h3 class="uni-card-title">${uni.name}</h3>
                <p class="uni-card-location"><i data-lucide="map-pin"></i> ${uni.city || 'Кампус'}, ${uni.country || 'Страна'}</p>
                <p class="uni-card-description">${uni.description || 'Официальный партнер THOTH.'}</p>
                
                <div class="uni-card-footer">
                    <span class="uni-stat"><i data-lucide="globe"></i> ${uni.website || 'Нет сайта'}</span>
                    <div class="uni-card-actions">
                        <button class="btn btn-outline btn-sm" id="view-${uni.id}">Подробнее</button>
                        <button class="btn btn-primary btn-sm" id="apply-${uni.id}">Подать документы</button>
                    </div>
                </div>
            </div>
        `;

        card.querySelector(`#view-${uni.id}`).addEventListener("click", (e) => {
            e.stopPropagation();
            window.location.hash = `university/${uni.id}`;
        });

        card.querySelector(`#apply-${uni.id}`).addEventListener("click", (e) => {
            e.stopPropagation();
            openQuickApplyModal(uni.id, uni.name);
        });

        card.addEventListener("click", () => {
            window.location.hash = `university/${uni.id}`;
        });

        container.appendChild(card);
    });

    lucide.createIcons();
}

// Populate university dropdown selection in form
function populateUniversityDropdowns(list) {
    const select = document.getElementById("form-university");
    // Clear and keep disabled placeholder
    select.innerHTML = `<option value="" disabled selected>Выберите университет...</option>`;
    list.forEach(uni => {
        const opt = document.createElement("option");
        opt.value = uni.id;
        opt.textContent = uni.name;
        select.appendChild(opt);
    });
}

// --- QUICK APPLY MODAL FUNCTIONS ---
async function openQuickApplyModal(uniId, uniName, preselectedSpecId = null, defaultAppType = "standard") {
    const modal = document.getElementById("quick-apply-modal");
    if (!modal) return;

    document.getElementById("quick-apply-uni-id").value = uniId;
    document.getElementById("apply-modal-uni-name").textContent = uniName;

    const appTypeElem = document.getElementById("quick-apply-app-type");
    if (appTypeElem) appTypeElem.value = defaultAppType;

    const savedName = localStorage.getItem("currentStudentName") || (window.currentStudentProfile ? window.currentStudentProfile.full_name : "");
    const savedPhone = localStorage.getItem("currentStudentPhone") || (window.currentStudentProfile ? window.currentStudentProfile.phone : "");
    
    if (savedName) document.getElementById("quick-apply-name").value = savedName;
    if (savedPhone) document.getElementById("quick-apply-phone").value = savedPhone;

    if (window.currentStudentProfile) {
        if (window.currentStudentProfile.ielts_score) document.getElementById("quick-apply-ielts").value = window.currentStudentProfile.ielts_score;
        if (window.currentStudentProfile.gpa) document.getElementById("quick-apply-gpa").value = window.currentStudentProfile.gpa;
    }

    const filePreview = document.getElementById("quick-file-name-preview");
    if (filePreview) {
        filePreview.textContent = "Файл не выбран";
        filePreview.style.color = "";
    }
    const fileInput = document.getElementById("quick-apply-file");
    if (fileInput) fileInput.value = "";

    const specSelect = document.getElementById("quick-apply-spec");
    specSelect.disabled = true;
    specSelect.innerHTML = `<option value="" disabled selected>Загрузка специальностей...</option>`;

    try {
        const res = await fetch(`${API_BASE}/api/v1/universities/${uniId}`);
        if (res.ok) {
            const data = await res.json();
            specSelect.innerHTML = `<option value="" disabled selected>Выберите специальность...</option>`;
            let specs = (data.specialties && data.specialties.length > 0) ? data.specialties : [
                { id: `gen-${uniId}-1`, name: "Общий прием / Бакалавриат", tuition_fee: data.contract_price || 12000000 },
                { id: `gen-${uniId}-2`, name: "Информационные технологии и ИИ", tuition_fee: data.contract_price || 14000000 },
                { id: `gen-${uniId}-3`, name: "Бизнес, Менеджмент и Маркетинг", tuition_fee: data.contract_price || 15000000 }
            ];

            specs.forEach(spec => {
                const opt = document.createElement("option");
                opt.value = spec.id;
                const feeStr = spec.tuition_fee ? ` — ${Number(spec.tuition_fee).toLocaleString("ru-RU")} сум/год` : "";
                opt.textContent = `${spec.name}${feeStr}`;
                if (preselectedSpecId && spec.id === preselectedSpecId) {
                    opt.selected = true;
                }
                specSelect.appendChild(opt);
            });
            specSelect.disabled = false;
        }
    } catch (e) {
        console.error("Error loading modal specialties:", e);
        specSelect.innerHTML = `<option value="" disabled selected>Ошибка загрузки направлений</option>`;
    }

    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("show"), 10);
    lucide.createIcons();
}

function closeQuickApplyModal() {
    const modal = document.getElementById("quick-apply-modal");
    if (!modal) return;
    modal.classList.remove("show");
    setTimeout(() => {
        modal.style.display = "none";
    }, 200);
}

// 2. Load university details
async function loadUniversityDetails(id) {
    try {
        const res = await fetch(`${API_BASE}/api/v1/universities/${id}`);
        if (!res.ok) throw new Error("Failed to load details");
        
        const uni = await res.json();
        
        // 1. Title, Alias & Slogan
        document.getElementById("det-uni-name").textContent = uni.name;
        
        const sloganElem = document.getElementById("det-uni-slogan");
        if (uni.slogan && uni.slogan.trim()) {
            sloganElem.textContent = uni.slogan.trim();
            sloganElem.style.display = "block";
        } else {
            sloganElem.textContent = "";
            sloganElem.style.display = "none";
        }
        
        // Alias generation (first letters of words, e.g. MIT)
        const words = uni.name.split(" ");
        const alias = words.map(w => w[0] ? w[0] : "").join("").toUpperCase().substring(0, 4);
        document.getElementById("det-uni-alias").textContent = alias || "UNI";

        const detailBanner = document.querySelector(".wb-product-banner");
        if (detailBanner) {
            if (uni.photo && uni.photo.startsWith("data:image/")) {
                detailBanner.style.backgroundImage = `url('${uni.photo}')`;
                detailBanner.style.backgroundSize = "cover";
                detailBanner.style.backgroundPosition = "center";
                document.getElementById("det-uni-alias").style.display = "none";
            } else {
                detailBanner.style.backgroundImage = "";
                detailBanner.style.backgroundSize = "";
                detailBanner.style.backgroundPosition = "";
                document.getElementById("det-uni-alias").style.display = "block";
            }
        }
        
        // 2. Description
        document.getElementById("det-uni-desc").textContent = uni.description || "Описание университета на модерации.";
        
        // 3. Specs Table (Calculated dynamically from specialties)
        document.getElementById("det-spec-country").textContent = uni.country;
        document.getElementById("det-spec-city").textContent = uni.city;
        
        const websiteLink = document.getElementById("det-spec-website");
        if (uni.website) {
            websiteLink.textContent = uni.website.replace("https://", "").replace("http://", "").split("/")[0];
            websiteLink.href = uni.website;
            websiteLink.style.display = "inline";
        } else {
            websiteLink.textContent = "не указан";
            websiteLink.removeAttribute("href");
        }
        
        let ieltsScores = [];
        let satScores = [];
        if (uni.specialties && Array.isArray(uni.specialties)) {
            uni.specialties.forEach(s => {
                if (s.min_requirements) {
                    const ieltsMatch = s.min_requirements.match(/IELTS\s*([0-9\.]+)/i);
                    if (ieltsMatch) ieltsScores.push(parseFloat(ieltsMatch[1]));
                    const satMatch = s.min_requirements.match(/SAT\s*([0-9]+)/i);
                    if (satMatch) satScores.push(parseInt(satMatch[1]));
                }
            });
        }

        const ieltsElem = document.getElementById("det-spec-ielts");
        if (ieltsScores.length > 0) {
            const minIelts = Math.min(...ieltsScores);
            const maxIelts = Math.max(...ieltsScores);
            ieltsElem.textContent = minIelts === maxIelts ? `${minIelts}` : `${minIelts} - ${maxIelts}`;
        } else {
            ieltsElem.textContent = uni.min_ielts ? `${uni.min_ielts}` : "—";
        }

        const satElem = document.getElementById("det-spec-sat");
        if (satScores.length > 0) {
            const minSat = Math.min(...satScores);
            const maxSat = Math.max(...satScores);
            satElem.textContent = minSat === maxSat ? `${minSat}` : `${minSat} - ${maxSat}`;
        } else {
            satElem.textContent = uni.min_sat ? `${uni.min_sat}` : "—";
        }
        
        // 4. Cost Range / Price Tag
        if (uni.specialties && uni.specialties.length > 0) {
            const fees = uni.specialties.map(s => parseFloat(s.tuition_fee)).filter(f => !isNaN(f));
            if (fees.length > 0) {
                const minFee = Math.min(...fees);
                document.getElementById("det-uni-price").textContent = `от $${minFee.toLocaleString()}/год`;
            } else {
                document.getElementById("det-uni-price").textContent = "от $1,500/год";
            }
        } else {
            document.getElementById("det-uni-price").textContent = "от $1,500/год";
        }
        
        // 5. Advantages (Dynamic, monochrome, no icons)
        renderUniversityAdvantages(uni, "det-advantages-container", false);

        // 5.5. Grants & Scholarships Section
        const grantsSection = document.getElementById("det-grants-section");
        const grantsContent = document.getElementById("det-grants-scholarships-content");
        if (grantsSection && grantsContent) {
            let html = "";
            if (uni.has_grant !== false || (uni.grant_info && uni.grant_info.trim())) {
                const gInfo = (uni.grant_info && uni.grant_info.trim()) 
                    ? uni.grant_info 
                    : "Покрытие до 100% стоимости обучения для абитуриентов с высокими баллами IELTS/SAT или по результатам вступительных испытаний.";
                html += `
                    <div style="background: var(--bg-accent); border: 1px solid var(--card-border); border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; gap: 1rem;">
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-primary); background: var(--card-bg); border: 1px solid var(--card-border); padding: 0.25rem 0.65rem; border-radius: 20px;">
                                    ГРАНТ НА ОБУЧЕНИЕ
                                </span>
                                <span style="font-size: 0.75rem; color: var(--text-muted);">Доступен</span>
                            </div>
                            <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">Грантовая программа</h4>
                            <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; margin: 0;">${gInfo}</p>
                        </div>
                        <button class="btn btn-primary btn-sm det-apply-grant-btn" style="width: 100%; height: 42px; font-weight: 600;">
                            Подать заявку на грант
                        </button>
                    </div>
                `;
            }
            if (uni.has_scholarship !== false || (uni.scholarship_info && uni.scholarship_info.trim())) {
                const sInfo = (uni.scholarship_info && uni.scholarship_info.trim()) 
                    ? uni.scholarship_info 
                    : "Академическая стипендия выплачивается ежемесячно студентам за отличную успеваемость и научную деятельность.";
                html += `
                    <div style="background: var(--bg-accent); border: 1px solid var(--card-border); border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; gap: 1rem;">
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                                <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-primary); background: var(--card-bg); border: 1px solid var(--card-border); padding: 0.25rem 0.65rem; border-radius: 20px;">
                                    АКАДЕМИЧЕСКАЯ СТИПЕНДИЯ
                                </span>
                                <span style="font-size: 0.75rem; color: var(--text-muted);">Доступна</span>
                            </div>
                            <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">Стипендиальная программа</h4>
                            <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; margin: 0;">${sInfo}</p>
                        </div>
                        <button class="btn btn-outline btn-sm det-apply-scholarship-btn" style="width: 100%; height: 42px; font-weight: 600;">
                            Подать заявку на стипендию
                        </button>
                    </div>
                `;
            }

            if (html) {
                grantsContent.innerHTML = html;
                grantsSection.style.display = "block";

                const grantBtn = grantsContent.querySelector(".det-apply-grant-btn");
                if (grantBtn) {
                    grantBtn.onclick = () => openQuickApplyModal(uni.id, uni.name, null, "grant");
                }
                const schBtn = grantsContent.querySelector(".det-apply-scholarship-btn");
                if (schBtn) {
                    schBtn.onclick = () => openQuickApplyModal(uni.id, uni.name, null, "scholarship");
                }
            } else {
                grantsSection.style.display = "none";
            }
        }
        
        // 6. Specialties Grid Rendering (Wildberries options layout)
        const specGrid = document.getElementById("det-specialties-grid");
        specGrid.innerHTML = "";
        
        if (uni.specialties && uni.specialties.length > 0) {
            uni.specialties.forEach(spec => {
                const card = document.createElement("div");
                card.className = "wb-spec-option glass-card";
                
                const tuitionDisplay = spec.tuition_fee ? `${parseInt(spec.tuition_fee).toLocaleString("ru-RU")} сум/год` : "Цена на модерации";
                const reqsDisplay = spec.min_requirements && spec.min_requirements.trim() ? spec.min_requirements : "Стандартные условия приёма (IELTS / Аттестат)";
                const langDisplay = spec.language || "Английский / Русский";
                const formatDisplay = spec.format || "Очный (Дневной)";
                const durationDisplay = spec.duration || "4 года (Бакалавриат)";
                const hasGrantBadge = (spec.has_grant || uni.has_grant) ? `<span style="display: inline-flex; align-items: center; font-size: 0.75rem; font-weight: 600; color: var(--text-primary); background: var(--bg-accent); border: 1px solid var(--card-border); padding: 0.2rem 0.5rem; border-radius: 6px; margin-top: 0.35rem;">Доступен грант</span>` : "";

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; width: 100%;">
                        <div>
                            <h4 style="font-family: var(--font-heading); font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">${spec.name}</h4>
                        </div>
                        <button class="btn btn-primary btn-sm" style="flex-shrink: 0;">Подать документы</button>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 1rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--card-border);">
                        <div>
                            <span style="font-size: 0.75rem; color: var(--text-secondary); display: block;">Форма обучения</span>
                            <strong style="font-size: 0.85rem; color: var(--text-primary);">${formatDisplay}</strong>
                        </div>
                        <div>
                            <span style="font-size: 0.75rem; color: var(--text-secondary); display: block;">Срок обучения</span>
                            <strong style="font-size: 0.85rem; color: var(--text-primary);">${durationDisplay}</strong>
                        </div>
                        <div>
                            <span style="font-size: 0.75rem; color: var(--text-secondary); display: block;">Язык обучения</span>
                            <strong style="font-size: 0.85rem; color: var(--text-primary);">${langDisplay}</strong>
                        </div>
                        <div>
                            <span style="font-size: 0.75rem; color: var(--text-secondary); display: block;">Стоимость обучения</span>
                            <strong style="font-size: 0.9rem; color: var(--primary);">${tuitionDisplay}</strong>
                            ${hasGrantBadge}
                        </div>
                    </div>

                    <div style="margin-top: 0.85rem; padding-top: 0.85rem; border-top: 1px dashed var(--card-border);">
                        <span style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 0.2rem;">Требования для поступления</span>
                        <p style="font-size: 0.85rem; font-weight: 500; color: var(--text-primary); margin: 0;">${reqsDisplay}</p>
                    </div>
                `;
                
                card.onclick = () => {
                    openQuickApplyModal(uni.id, uni.name, spec.id);
                };
                
                specGrid.appendChild(card);
            });
        } else {
            specGrid.innerHTML = `<div style="grid-column: 1 / -1; color: var(--text-secondary); text-align: center; padding: 2rem;">Специальности пока не добавлены или находятся на модерации.</div>`;
        }

        // Bind details page button
        const applyBtn = document.querySelector("#page-university .apply-now-btn");
        if (applyBtn) {
            applyBtn.onclick = () => {
                openQuickApplyModal(uni.id, uni.name);
            };
        }

        lucide.createIcons();
    } catch (err) {
        console.error("Failed to load details:", err);
        showToast("Не удалось загрузить подробности об университете", "danger");
        window.location.hash = "home";
    }
}

// Load specialties and preselect a specific one
async function loadSpecialtiesAndSelect(uniId, specId) {
    const specSelect = document.getElementById("form-specialty");
    specSelect.disabled = true;
    specSelect.innerHTML = `<option value="" disabled>Загрузка специальностей...</option>`;
    
    try {
        const res = await fetch(`${API_BASE}/api/v1/universities/${uniId}`);
        if (!res.ok) throw new Error("Failed loading specialties");
        
        const data = await res.json();
        specSelect.innerHTML = `<option value="" disabled>Выберите специальность...</option>`;
        
        if (data.specialties && data.specialties.length > 0) {
            data.specialties.forEach(spec => {
                const opt = document.createElement("option");
                opt.value = spec.id;
                opt.textContent = spec.code ? `${spec.name} (${spec.code})` : spec.name;
                if (spec.id === specId) {
                    opt.selected = true;
                }
                specSelect.appendChild(opt);
            });
            specSelect.disabled = false;
        } else {
            specSelect.innerHTML = `<option value="" disabled selected>Нет доступных специальностей</option>`;
        }
    } catch (err) {
        console.error("Error preselecting specialty:", err);
        specSelect.innerHTML = `<option value="" disabled selected>Ошибка загрузки специальностей</option>`;
    }
}

// 3. Load specialties for application form dropdown
async function loadSpecialtiesForForm(uniId) {
    const specSelect = document.getElementById("form-specialty");
    specSelect.disabled = true;
    specSelect.innerHTML = `<option value="" disabled selected>Загрузка специальностей...</option>`;
    
    try {
        const res = await fetch(`${API_BASE}/api/v1/universities/${uniId}`);
        if (!res.ok) throw new Error("Failed loading specialties");
        
        const data = await res.json();
        specSelect.innerHTML = `<option value="" disabled selected>Выберите специальность...</option>`;
        
        if (data.specialties && data.specialties.length > 0) {
            data.specialties.forEach(spec => {
                const opt = document.createElement("option");
                opt.value = spec.id;
                opt.textContent = spec.code ? `${spec.name} (${spec.code})` : spec.name;
                specSelect.appendChild(opt);
            });
            specSelect.disabled = false;
        } else {
            specSelect.innerHTML = `<option value="" disabled selected>Нет доступных направлений</option>`;
        }
    } catch (err) {
        console.error("Error specialties load:", err);
        specSelect.innerHTML = `<option value="" disabled selected>Ошибка загрузки направлений</option>`;
    }
}

// 4. Load Student digital passport & applications list
async function loadStudentProfile(phone, notifyUser = true) {
    try {
        const encodedPhone = encodeURIComponent(phone);
        const res = await fetch(`${API_BASE}/api/v1/students/${encodedPhone}/profile`);
        
        if (res.status === 404) {
            if (notifyUser) {
                showToast("Цифровой паспорт по этому номеру телефона отсутствует. Заполните анкету справа.", "danger");
            }
            resetPassportCard(phone);
            return;
        }

        if (!res.ok) throw new Error("Server error loading profile");

        const data = await res.json();
        
        // Populate Passport details in UI
        const profile = data.profile;
        document.getElementById("pass-fullname").textContent = profile.full_name;
        document.getElementById("pass-phone").textContent = profile.phone;
        document.getElementById("pass-ielts").textContent = profile.ielts_score !== null ? profile.ielts_score : "—";
        document.getElementById("pass-sat").textContent = profile.sat_score !== null ? profile.sat_score : "—";
        document.getElementById("pass-gpa").textContent = profile.gpa !== null ? profile.gpa : "—";
        document.getElementById("pass-birthday").textContent = profile.birthday ? formatDate(profile.birthday) : "—";
        document.getElementById("pass-bio").textContent = profile.bio || "О себе: информация отсутствует.";
        document.getElementById("pass-achievements").textContent = profile.extra_achievements || "Дополнительные достижения не указаны.";
        
        // Auto-fill apply form fields from loaded passport data
        document.getElementById("form-fullname").value = profile.full_name || "";
        document.getElementById("form-phone").value = profile.phone || "";
        document.getElementById("form-ielts").value = profile.ielts_score !== null ? profile.ielts_score : "";
        document.getElementById("form-sat").value = profile.sat_score !== null ? profile.sat_score : "";
        document.getElementById("form-gpa").value = profile.gpa !== null ? profile.gpa : "";
        document.getElementById("form-bio").value = profile.bio || "";
        document.getElementById("form-achievements").value = profile.extra_achievements || "";

        // Save active student session
        localStorage.setItem("currentStudentPhone", profile.phone);
        window.currentStudentProfile = profile;

        // Avatar Initial
        const firstLetter = profile.full_name ? profile.full_name[0].toUpperCase() : "Д";
        document.getElementById("pass-avatar-letter").textContent = firstLetter;

        // Render applicant timeline
        renderStudentApplications(data.applications);

        // Sync form button and banner styles
        updateProfileFormUI();

        // Sync AI Orientation widget auth state
        if (typeof checkAiAuthStatus === "function") checkAiAuthStatus();

        if (notifyUser) {
            showToast("Цифровой паспорт успешно загружен!", "success");
        }
    } catch (err) {
        console.error("Profile load err:", err);
        if (notifyUser) {
            showToast("Не удалось связаться с сервером для загрузки профиля", "danger");
        }
    }
}

// Resets passport visual card to default state
function resetPassportCard(phone = "") {
    document.getElementById("pass-fullname").textContent = "Новый абитуриент";
    document.getElementById("pass-phone").textContent = phone || "Номер не указан";
    document.getElementById("pass-ielts").textContent = "—";
    document.getElementById("pass-sat").textContent = "—";
    document.getElementById("pass-gpa").textContent = "—";
    document.getElementById("pass-birthday").textContent = "—";
    document.getElementById("pass-bio").textContent = "Информация не заполнена.";
    document.getElementById("pass-achievements").textContent = "Нет данных.";
    document.getElementById("pass-avatar-letter").textContent = "?";
    
    const appsList = document.getElementById("profile-applications-list");
    appsList.innerHTML = `
        <div class="no-applications">
            <i data-lucide="folder-open"></i>
            <p>У вас пока нет активных заявок. Заполните форму справа, чтобы подать первую заявку.</p>
        </div>
    `;
    window.currentStudentProfile = null;
    updateProfileFormUI();
    if (typeof checkAiAuthStatus === "function") checkAiAuthStatus();
    lucide.createIcons();
}

// Render student timeline applications list
function renderStudentApplications(apps) {
    const list = document.getElementById("profile-applications-list");
    
    if (!apps || apps.length === 0) {
        list.innerHTML = `
            <div class="no-applications">
                <i data-lucide="folder-open"></i>
                <p>Пока нет поданных заявок.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    list.innerHTML = "";
    apps.forEach(app => {
        const item = document.createElement("div");
        item.className = "app-timeline-item";
        
        const dateObj = new Date(app.created_at);
        const formattedDate = dateObj.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
        
        let statusText = "На модерации";
        if (app.status === "under_review") statusText = "На рассмотрении";
        if (app.status === "accepted") statusText = "Принят";
        if (app.status === "rejected") statusText = "Отклонен";

        let appTypeBadge = `<span style="font-size: 0.72rem; color: var(--text-secondary); background: var(--bg-accent); border: 1px solid var(--card-border); padding: 0.15rem 0.45rem; border-radius: 4px; display: inline-block; margin-left: 0.35rem;">Контракт</span>`;
        if (app.app_type === "grant") {
            appTypeBadge = `<span style="font-size: 0.72rem; color: var(--text-primary); background: var(--card-bg); border: 1px solid var(--card-border); padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 700; display: inline-block; margin-left: 0.35rem;">Грант</span>`;
        } else if (app.app_type === "scholarship") {
            appTypeBadge = `<span style="font-size: 0.72rem; color: var(--text-primary); background: var(--card-bg); border: 1px solid var(--card-border); padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 700; display: inline-block; margin-left: 0.35rem;">Стипендия</span>`;
        }

        let contactBoxHtml = "";
        if (app.status === "accepted" || app.status === "approved") {
            const accMsg = (app.accepted_message && app.accepted_message.trim())
                ? app.accepted_message
                : ((app.university_contact_info && app.university_contact_info.trim()) ? app.university_contact_info : `Поздравляем с зачислением! Пожалуйста, свяжитесь с приёмной комиссией для предоставления документов.`);
            const phoneText = app.admissions_phone ? `\nТелефон приёмной комиссии: ${app.admissions_phone}` : "";
            
            contactBoxHtml = `
                <div style="width: 100%; margin-top: 0.75rem; background: var(--bg-accent); padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid var(--card-border);">
                    <h5 style="margin: 0 0 0.35rem 0; font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">
                        Сообщение приемной комиссии (Поступление):
                    </h5>
                    <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0; white-space: pre-line; line-height: 1.4;">${accMsg}${phoneText}</p>
                </div>
            `;
        } else if (app.status === "rejected" && app.rejected_message && app.rejected_message.trim()) {
            contactBoxHtml = `
                <div style="width: 100%; margin-top: 0.75rem; background: var(--bg-accent); padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid var(--card-border);">
                    <h5 style="margin: 0 0 0.35rem 0; font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">
                        Сообщение приемной комиссии:
                    </h5>
                    <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0; white-space: pre-line; line-height: 1.4;">${app.rejected_message}</p>
                </div>
            `;
        }

        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                <div class="app-time-info">
                    <h4>${app.university_name} ${appTypeBadge}</h4>
                    <p>${app.specialty_name}</p>
                    <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;"><i data-lucide="file" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> ${app.document_name}</p>
                </div>
                <div>
                    <span class="status-badge status-${app.status}">${statusText}</span>
                    <p style="font-size:0.75rem; color:var(--text-muted); text-align:right; margin-top:0.4rem;">${formattedDate}</p>
                </div>
            </div>
            ${contactBoxHtml}
        `;
        list.appendChild(item);
    });
    lucide.createIcons();
}

// 5. Submit Application (Student)
async function handleApplicationSubmit(e) {
    e.preventDefault();

    const uniId = document.getElementById("form-university").value;
    const specId = document.getElementById("form-specialty").value;
    const fullName = document.getElementById("form-fullname").value;
    const phone = document.getElementById("form-phone").value;
    const ielts = document.getElementById("form-ielts").value;
    const sat = document.getElementById("form-sat").value;
    const gpa = document.getElementById("form-gpa").value;
    const bio = document.getElementById("form-bio").value;
    const achievements = document.getElementById("form-achievements").value;
    const file = document.getElementById("form-file").files[0];
    
    const submitBtn = document.getElementById("submit-application-btn");
    submitBtn.disabled = true;

    if (!uniId) {
        // Simple profile save flow (no university selected)
        submitBtn.innerHTML = `<i data-lucide="loader" class="btn-icon animate-spin"></i> Сохранение профиля...`;
        lucide.createIcons();

        const birthday = window.currentStudentProfile ? window.currentStudentProfile.birthday : null;

        try {
            const res = await fetch(`${API_BASE}/api/v1/students/profile`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    full_name: fullName,
                    phone: phone,
                    birthday: birthday,
                    gpa: gpa ? parseFloat(gpa) : null,
                    ielts_score: ielts ? parseFloat(ielts) : null,
                    sat_score: sat ? parseInt(sat) : null,
                    bio: bio,
                    extra_achievements: achievements
                })
            });

            if (!res.ok) throw new Error("Не удалось сохранить профиль");
            
            showToast("Профиль успешно сохранен!", "success");
            await loadStudentProfile(phone, false);
        } catch (err) {
            showToast(err.message || "Ошибка при сохранении профиля", "danger");
        } finally {
            submitBtn.disabled = false;
            updateProfileFormUI();
        }
        return;
    }

    // Existing university application submit flow
    if (!specId) {
        showToast("Пожалуйста, выберите специальность", "danger");
        submitBtn.disabled = false;
        updateProfileFormUI();
        return;
    }

    submitBtn.innerHTML = `<i data-lucide="loader" class="btn-icon animate-spin"></i> Передача документов...`;
    lucide.createIcons();

    if (!file) {
        showToast("Пожалуйста, прикрепите скан аттестата или сертификата", "danger");
        submitBtn.disabled = false;
        updateProfileFormUI();
        return;
    }

    const formData = new FormData();
    formData.append("university_id", uniId);
    formData.append("specialty_id", specId);
    formData.append("full_name", fullName);
    formData.append("phone", phone);
    if (ielts) formData.append("ielts_score", ielts);
    if (sat) formData.append("sat_score", sat);
    if (gpa) formData.append("gpa", gpa);
    if (bio) formData.append("bio", bio);
    if (achievements) formData.append("extra_achievements", achievements);
    formData.append("file", file);

    try {
        const res = await fetch(`${API_BASE}/api/v1/applications/apply`, {
            method: "POST",
            body: formData
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || "Error submitting documents");
        }

        // Show green toast notification (requested explicitly in the prompt)
        showToast("Документы успешно переданы в приемную комиссию", "success");
        
        // Reload student profile to display new application in timeline
        await loadStudentProfile(phone, false);
        
        // Reset selected university and specialty after successful application
        document.getElementById("form-university").value = "";
        document.getElementById("form-specialty").value = "";

        // Reset file preview
        document.getElementById("form-file").value = "";
        document.getElementById("file-name-preview").textContent = "Файл не выбран";
        document.getElementById("file-name-preview").style.color = "";

    } catch (err) {
        showToast(err.message || "Ошибка отправки документов", "danger");
    } finally {
        submitBtn.disabled = false;
        updateProfileFormUI();
    }
}

// 6. Login representative
async function handlePartnerLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();

    try {
        const res = await fetch(`${API_BASE}/api/v1/partners/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || "Ошибка входа");
        }

        localStorage.setItem("currentPartner", JSON.stringify(data));
        showToast("Успешный вход в кабинет!", "success");
        document.getElementById("partner-login-form").reset();
        
        renderPartnerCabinet();
    } catch (err) {
        showToast(err.message || "Ошибка авторизации", "danger");
    }
}

// 7. Signup representative
async function handlePartnerSignupSubmit(e) {
    e.preventDefault();

    const personalEmail = document.getElementById("part-personal-email").value.trim();
    const password = document.getElementById("part-password").value.trim();
    const universityEmail = document.getElementById("part-uni-email").value.trim();
    const name = document.getElementById("part-uni-name").value.trim();
    const contactName = document.getElementById("part-contact-name").value.trim();
    const contactInfo = document.getElementById("part-contact-info").value.trim();
    const website = document.getElementById("part-website").value.trim();

    const payload = {
        personal_email: personalEmail,
        password,
        university_email: universityEmail,
        name,
        contact_name: contactName,
        contact_info: contactInfo,
        website: website || null
    };

    try {
        const res = await fetch(`${API_BASE}/api/v1/universities/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.detail || "Ошибка регистрации");
        }

        showToast("Аккаунт успешно создан и отправлен на модерацию в Telegram. После одобрения вы сможете войти.", "success");
        document.getElementById("partner-signup-form").reset();
        
        // Switch tab back to login
        document.getElementById("tab-login-btn").click();
    } catch (err) {
        showToast(err.message || "Ошибка регистрации", "danger");
    }
}

// 8. Open wizard (creating or editing university profile)
function openWizard(isEdit = false) {
    document.getElementById("partner-no-profile-view").style.display = "none";
    document.getElementById("partner-dashboard-view").style.display = "none";
    document.getElementById("partner-wizard-view").style.display = "block";
    
    
    // Reset wizard steps
    document.getElementById("wizard-step-1").style.display = "block";
    document.getElementById("wizard-step-2").style.display = "none";
    document.getElementById("partner-step-ind-1").style.color = "var(--primary)";
    document.getElementById("partner-step-ind-2").style.color = "var(--text-muted)";
    
    const wizardPhotoPreviewContainer = document.getElementById("wizard-photo-preview-container");
    const wizardPhotoPreview = document.getElementById("wizard-photo-preview");
    const wizardPhotoInput = document.getElementById("wizard-photo");

    if (isEdit && myUniversity) {
        document.getElementById("wizard-name").value = myUniversity.name || "";
        document.getElementById("wizard-country").value = myUniversity.country || "";
        document.getElementById("wizard-city").value = myUniversity.city || "";
        document.getElementById("wizard-website").value = myUniversity.website || "";
        document.getElementById("wizard-description").value = myUniversity.description || "";
        document.getElementById("wizard-ielts").value = myUniversity.min_ielts || "";
        document.getElementById("wizard-sat").value = myUniversity.min_sat || "";
        document.getElementById("wizard-slogan").value = myUniversity.slogan || "";

        const hasGrantBox = document.getElementById("wizard-has-grant");
        const grantInfoInput = document.getElementById("wizard-grant-info");
        const hasSchBox = document.getElementById("wizard-has-scholarship");
        const schInfoInput = document.getElementById("wizard-scholarship-info");
        const contactInfoInput = document.getElementById("wizard-contact-info");

        if (hasGrantBox) hasGrantBox.checked = myUniversity.has_grant !== false;
        if (grantInfoInput) grantInfoInput.value = myUniversity.grant_info || "";
        if (hasSchBox) hasSchBox.checked = myUniversity.has_scholarship !== false;
        if (schInfoInput) schInfoInput.value = myUniversity.scholarship_info || "";
        if (contactInfoInput) contactInfoInput.value = myUniversity.contact_info || "";
        
        // Load advantages dynamically
        currentAdvantages = [];
        if (myUniversity.adv_1_title) currentAdvantages.push({ title: myUniversity.adv_1_title, desc: myUniversity.adv_1_desc || "" });
        if (myUniversity.adv_2_title) currentAdvantages.push({ title: myUniversity.adv_2_title, desc: myUniversity.adv_2_desc || "" });
        if (myUniversity.adv_3_title) currentAdvantages.push({ title: myUniversity.adv_3_title, desc: myUniversity.adv_3_desc || "" });
        
        wizardPhotoBase64 = myUniversity.photo || "";
        if (wizardPhotoBase64 && wizardPhotoPreview) {
            wizardPhotoPreview.src = wizardPhotoBase64;
            if (wizardPhotoPreviewContainer) wizardPhotoPreviewContainer.style.display = "flex";
        } else {
            if (wizardPhotoPreviewContainer) wizardPhotoPreviewContainer.style.display = "none";
        }

        currentSpecialties = myUniversity.specialties ? [...myUniversity.specialties] : [];
    } else {
        document.getElementById("wizard-form").reset();
        wizardPhotoBase64 = "";
        if (wizardPhotoInput) wizardPhotoInput.value = "";
        if (wizardPhotoPreviewContainer) wizardPhotoPreviewContainer.style.display = "none";
        if (wizardPhotoPreview) wizardPhotoPreview.src = "";
        currentAdvantages = [];
        currentSpecialties = [];
    }
    
    renderWizardAdvantages();
    
    // Initialize searchable fields
    setupAutocomplete("wizard-name", "wizard-name-dropdown", POPULAR_UNIVERSITIES);
    setupAutocomplete("wizard-country", "wizard-country-dropdown", COUNTRIES);
    
    renderWizardSpecialties();
    syncWizardLivePreview();
}

// 9. Submit onboarding wizard
async function handleWizardSubmit(e) {
    if (e) e.preventDefault();

    const nameVal = document.getElementById("wizard-name") ? document.getElementById("wizard-name").value.trim() : "";
    const countryVal = document.getElementById("wizard-country") ? document.getElementById("wizard-country").value.trim() : "";
    const cityVal = document.getElementById("wizard-city") ? document.getElementById("wizard-city").value.trim() : "";

    if (!nameVal || !countryVal || !cityVal) {
        showToast("Пожалуйста, заполните название университета, страну и город на шаге 1", "danger");
        document.getElementById("wizard-step-1").style.display = "block";
        document.getElementById("wizard-step-2").style.display = "none";
        return;
    }

    if (!currentSpecialties || currentSpecialties.length === 0) {
        showToast("Пожалуйста, добавьте хотя бы одну специальность", "danger");
        return;
    }

    // Validate fields inside currentSpecialties
    const hasEmpty = currentSpecialties.some(s => !s.name || !s.name.trim() || !s.tuition_fee);
    if (hasEmpty) {
        showToast("Заполните название и стоимость для всех специальностей", "danger");
        return;
    }

    // Compute IELTS / SAT range from currentSpecialties
    let calcIelts = [];
    let calcSat = [];
    currentSpecialties.forEach(s => {
        if (s.min_requirements) {
            const mI = s.min_requirements.match(/IELTS\s*([0-9\.]+)/i);
            if (mI) calcIelts.push(parseFloat(mI[1]));
            const mS = s.min_requirements.match(/SAT\s*([0-9]+)/i);
            if (mS) calcSat.push(parseInt(mS[1]));
        }
    });

    const hasGrantElem = document.getElementById("wizard-has-grant");
    const grantInfoElem = document.getElementById("wizard-grant-info");
    const hasSchElem = document.getElementById("wizard-has-scholarship");
    const schInfoElem = document.getElementById("wizard-scholarship-info");

    const payload = {
        partner_id: currentPartner ? currentPartner.id : "partner-default",
        name: nameVal,
        country: countryVal,
        city: cityVal,
        website: document.getElementById("wizard-website") ? document.getElementById("wizard-website").value.trim() : "",
        description: document.getElementById("wizard-description") ? document.getElementById("wizard-description").value.trim() : "",
        min_ielts: calcIelts.length > 0 ? Math.min(...calcIelts) : null,
        min_sat: calcSat.length > 0 ? Math.min(...calcSat) : null,
        slogan: document.getElementById("wizard-slogan") ? document.getElementById("wizard-slogan").value.trim() : "",
        contact_info: document.getElementById("wizard-contact-info") ? document.getElementById("wizard-contact-info").value.trim() : "",
        adv_1_title: currentAdvantages[0] ? currentAdvantages[0].title.trim() : "",
        adv_1_desc: currentAdvantages[0] ? currentAdvantages[0].desc.trim() : "",
        adv_2_title: currentAdvantages[1] ? currentAdvantages[1].title.trim() : "",
        adv_2_desc: currentAdvantages[1] ? currentAdvantages[1].desc.trim() : "",
        adv_3_title: currentAdvantages[2] ? currentAdvantages[2].title.trim() : "",
        adv_3_desc: currentAdvantages[2] ? currentAdvantages[2].desc.trim() : "",
        has_grant: hasGrantElem ? hasGrantElem.checked : false,
        grant_info: grantInfoElem ? grantInfoElem.value.trim() : "",
        has_scholarship: hasSchElem ? hasSchElem.checked : false,
        scholarship_info: schInfoElem ? schInfoElem.value.trim() : "",
        photo: wizardPhotoBase64,
        specialties: currentSpecialties
    };

    try {
        const res = await fetch(`${API_BASE}/api/v1/universities/profile`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || "Ошибка сохранения профиля");
        }

        showToast("🎉 Профиль университета успешно отправлен на модерацию!", "success");
        if (data.university) {
            myUniversity = data.university;
        }
        renderPartnerCabinet();
    } catch (err) {
        showToast(err.message || "Ошибка отправки профиля", "danger");
    }
}

// 10. Partner cabinet renderer
async function renderPartnerCabinet() {
    const partnerData = localStorage.getItem("currentPartner");
    if (!partnerData) {
        currentPartner = null;
        document.getElementById("partner-auth-block").style.display = "block";
        document.getElementById("partner-cabinet-block").style.display = "none";
        return;
    }

    currentPartner = JSON.parse(partnerData);
    document.getElementById("partner-auth-block").style.display = "none";
    document.getElementById("partner-cabinet-block").style.display = "block";
    document.getElementById("cabinet-user-email").textContent = currentPartner.email;
    
    const statusBadge = document.getElementById("cabinet-user-status");
    statusBadge.textContent = currentPartner.status === "approved" ? "Верифицирован" : currentPartner.status;
    if (currentPartner.status === "approved") {
        statusBadge.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
        statusBadge.style.color = "#10B981";
    } else {
        statusBadge.style.backgroundColor = "rgba(217, 119, 6, 0.1)";
        statusBadge.style.color = "#D97706";
    }

    try {
        const res = await fetch(`${API_BASE}/api/v1/universities/my-profile/${currentPartner.id}`);
        if (!res.ok) throw new Error("Failed to load profile");
        myUniversity = await res.json();
        
        if (!myUniversity) {
            document.getElementById("partner-no-profile-view").style.display = "block";
            document.getElementById("partner-pending-profile-notice").style.display = "none";
            document.getElementById("partner-wizard-view").style.display = "none";
            document.getElementById("partner-dashboard-view").style.display = "none";
        } else {
            document.getElementById("partner-no-profile-view").style.display = "none";
            
            
            if (myUniversity.status === "pending_profile") {
                document.getElementById("partner-pending-profile-notice").style.display = "block";
            } else {
                document.getElementById("partner-pending-profile-notice").style.display = "none";
            }

            document.getElementById("partner-wizard-view").style.display = "none";
            document.getElementById("partner-dashboard-view").style.display = "block";
            document.getElementById("dash-uni-name").textContent = myUniversity.name;
            
            loadPartnerDashboardData(myUniversity.id);
        }
    } catch (err) {
        showToast(err.message || "Ошибка загрузки кабинета", "danger");
    }
}

// 11. Fetch statistics and list leads for active partner dashboard
async function loadPartnerDashboardData(uniId) {
    try {
        const statsRes = await fetch(`${API_BASE}/api/v1/dashboard/${uniId}/stats`);
        if (!statsRes.ok) throw new Error("Stats load error");
        const stats = await statsRes.json();

        document.getElementById("kpi-views").textContent = stats.total_views;
        document.getElementById("kpi-applications").textContent = stats.total_applications;
        document.getElementById("kpi-conversion").textContent = `${stats.conversion_rate}%`;

        renderTelemetryChart(stats.chart_data);

        const leadsRes = await fetch(`${API_BASE}/api/v1/dashboard/${uniId}/leads`);
        if (!leadsRes.ok) throw new Error("Leads load error");
        loadedLeads = await leadsRes.json();

        renderLeadsTable();
    } catch (err) {
        showToast(err.message || "Ошибка загрузки статистики", "danger");
    }
}

// Render student leads list with search and sort criteria
function renderLeadsTable() {
    const tableBody = document.getElementById("leads-table-body");
    if (!tableBody) return;

    if (loadedLeads.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="table-empty-row">
                    <i data-lucide="inbox" style="margin: 0 auto 0.5rem auto;"></i>
                    <p>Заявки на поступление отсутствуют.</p>
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }

    // 1. Get Sort and Filter Options
    const sortVal = document.getElementById("leads-sort-select") ? document.getElementById("leads-sort-select").value : "date-desc";
    const searchQuery = document.getElementById("table-search-input") ? document.getElementById("table-search-input").value.toLowerCase().trim() : "";

    // 2. Clone, Filter and Sort leads
    let filteredLeads = [...loadedLeads];
    if (searchQuery) {
        filteredLeads = filteredLeads.filter(lead => {
            const name = (lead.student.full_name || "").toLowerCase();
            const specName = (lead.specialty.name || "").toLowerCase();
            const specCode = (lead.specialty.code || "").toLowerCase();
            return name.includes(searchQuery) || specName.includes(searchQuery) || specCode.includes(searchQuery);
        });
    }

    // Render empty row if filter yields 0 results
    if (filteredLeads.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="table-empty-row">
                    <i data-lucide="search" style="margin: 0 auto 0.5rem auto;"></i>
                    <p>Ничего не найдено по запросу "${searchQuery}"</p>
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }

    filteredLeads.sort((a, b) => {
        if (sortVal === "date-desc") {
            return new Date(b.created_at) - new Date(a.created_at);
        } else if (sortVal === "date-asc") {
            return new Date(a.created_at) - new Date(b.created_at);
        } else if (sortVal === "best-scores") {
            const getNormScore = (lead) => {
                const sat = lead.student.sat_score !== null ? parseFloat(lead.student.sat_score) / 1600 : null;
                const ielts = lead.student.ielts_score !== null ? parseFloat(lead.student.ielts_score) / 9 : null;
                if (sat !== null && ielts !== null) return (sat + ielts) / 2;
                if (sat !== null) return sat;
                if (ielts !== null) return ielts;
                return -1;
            };
            return getNormScore(b) - getNormScore(a);
        } else if (sortVal === "sat-desc") {
            const scoreA = a.student.sat_score !== null ? parseFloat(a.student.sat_score) : -1;
            const scoreB = b.student.sat_score !== null ? parseFloat(b.student.sat_score) : -1;
            return scoreB - scoreA;
        } else if (sortVal === "sat-asc") {
            const scoreA = a.student.sat_score !== null ? parseFloat(a.student.sat_score) : 9999;
            const scoreB = b.student.sat_score !== null ? parseFloat(b.student.sat_score) : 9999;
            return scoreA - scoreB;
        } else if (sortVal === "ielts-desc") {
            const scoreA = a.student.ielts_score !== null ? parseFloat(a.student.ielts_score) : -1;
            const scoreB = b.student.ielts_score !== null ? parseFloat(b.student.ielts_score) : -1;
            return scoreB - scoreA;
        } else if (sortVal === "ielts-asc") {
            const scoreA = a.student.ielts_score !== null ? parseFloat(a.student.ielts_score) : 99;
            const scoreB = b.student.ielts_score !== null ? parseFloat(b.student.ielts_score) : 99;
            return scoreA - scoreB;
        }
        return 0;
    });

    // 3. Render HTML
    tableBody.innerHTML = "";
    filteredLeads.forEach(lead => {
        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        const dateObj = new Date(lead.created_at);
        const formattedDate = dateObj.toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

        const ieltsVal = lead.student && lead.student.ielts_score !== null ? `IELTS ${lead.student.ielts_score}` : "";
        const satVal = lead.student && lead.student.sat_score !== null ? `SAT ${lead.student.sat_score}` : "";
        const statsBadge = [ieltsVal, satVal].filter(Boolean).join(" / ") || "—";
        const studentName = (lead.student && lead.student.full_name) ? lead.student.full_name : "Абитуриент";
        const studentPhone = (lead.student && lead.student.phone) ? lead.student.phone : "—";
        const specName = (lead.specialty && lead.specialty.name) ? lead.specialty.name : "Общее направление";
        const specCode = (lead.specialty && lead.specialty.code) ? lead.specialty.code : "";

        let appTypeBadge = `<span class="badge" style="background: var(--bg-accent); border: 1px solid var(--card-border); color: var(--text-secondary); font-size: 0.7rem; margin-top: 0.25rem; display: inline-block;">КОНТРАКТ</span>`;
        if (lead.app_type === "grant") {
            appTypeBadge = `<span class="badge" style="background: var(--card-bg); border: 1px solid var(--card-border); color: var(--text-primary); font-size: 0.7rem; margin-top: 0.25rem; display: inline-block; font-weight: 700;">ГРАНТ</span>`;
        } else if (lead.app_type === "scholarship") {
            appTypeBadge = `<span class="badge" style="background: var(--card-bg); border: 1px solid var(--card-border); color: var(--text-primary); font-size: 0.7rem; margin-top: 0.25rem; display: inline-block; font-weight: 700;">СТИПЕНДИЯ</span>`;
        }

        const statusSelectHtml = `
            <select class="table-status-select" data-app-id="${lead.id}">
                <option value="pending" ${lead.status === 'pending' ? 'selected' : ''}>На модерации</option>
                <option value="under_review" ${lead.status === 'under_review' ? 'selected' : ''}>На рассмотрении</option>
                <option value="accepted" ${lead.status === 'accepted' || lead.status === 'approved' ? 'selected' : ''}>Одобрен ВУЗом</option>
                <option value="rejected" ${lead.status === 'rejected' ? 'selected' : ''}>Отклонен</option>
            </select>
        `;

        tr.innerHTML = `
            <td style="font-weight: 600; color: var(--primary);">${studentName}</td>
            <td style="font-size: 0.85rem; color: var(--text-secondary);">${studentPhone}</td>
            <td>
                <span style="font-weight:500;">${specName}</span>
                <br>${appTypeBadge}
            </td>
            <td style="font-weight: 500; color: var(--primary);">${statsBadge}</td>
            <td>
                <a href="${API_BASE}/api/v1/applications/download/${lead.id}" class="download-link" target="_blank" onclick="event.stopPropagation();">
                    <i data-lucide="download"></i> Скачать
                </a>
            </td>
            <td onclick="event.stopPropagation();">${statusSelectHtml}</td>
            <td style="font-size: 0.85rem; color: var(--text-secondary);">${formattedDate}</td>
        `;

        tr.addEventListener("click", () => {
            openLeadStudentModal(lead);
        });

        tr.querySelector(".table-status-select").addEventListener("change", async (e) => {
            e.stopPropagation();
            const newStatus = e.target.value;
            await updateLeadApplicationStatus(lead.id, newStatus, lead);
        });

        tableBody.appendChild(tr);
    });

    lucide.createIcons();
}

// --- PARTNER LEAD STUDENT MODAL FUNCTIONS ---
function openLeadStudentModal(lead) {
    const modal = document.getElementById("student-profile-modal");
    if (!modal) return;

    const studentName = (lead.student && lead.student.full_name) ? lead.student.full_name : "Абитуриент";
    document.getElementById("lead-modal-student-name").textContent = studentName;
    
    const dateObj = new Date(lead.created_at);
    const dateStr = dateObj.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
    document.getElementById("lead-modal-app-date").textContent = `Подано: ${dateStr}`;

    document.getElementById("lead-modal-phone").textContent = (lead.student && lead.student.phone) ? lead.student.phone : "—";
    
    const tgHandle = (lead.student && lead.student.telegram) ? lead.student.telegram : "";
    const tgDisplay = tgHandle ? (tgHandle.startsWith("@") ? tgHandle : `@${tgHandle}`) : "не указан";
    document.getElementById("lead-modal-telegram").textContent = tgDisplay;

    const specName = (lead.specialty && lead.specialty.name) ? lead.specialty.name : "Общее направление";
    const specCode = (lead.specialty && lead.specialty.code) ? lead.specialty.code : "";
    document.getElementById("lead-modal-specialty").textContent = specCode ? `${specName} (${specCode})` : specName;

    document.getElementById("lead-modal-ielts").textContent = (lead.student && lead.student.ielts_score !== null) ? lead.student.ielts_score : "—";
    document.getElementById("lead-modal-sat").textContent = (lead.student && lead.student.sat_score !== null) ? lead.student.sat_score : "—";
    document.getElementById("lead-modal-gpa").textContent = (lead.student && lead.student.gpa !== null) ? lead.student.gpa : "—";

    document.getElementById("lead-modal-doc-name").textContent = lead.document_name || "Файл заявки";
    document.getElementById("lead-modal-doc-link").href = `${API_BASE}/api/v1/applications/download/${lead.id}`;

    const badge = document.getElementById("lead-modal-status-badge");
    if (lead.status === "accepted" || lead.status === "approved") {
        badge.className = "badge badge-success";
        badge.textContent = "Одобрен ВУЗом";
    } else if (lead.status === "rejected") {
        badge.className = "badge badge-danger";
        badge.textContent = "Отклонен";
    } else {
        badge.className = "badge badge-warning";
        badge.textContent = "На рассмотрении";
    }

    const approveBtn = document.getElementById("lead-action-approve-btn");
    const rejectBtn = document.getElementById("lead-action-reject-btn");

    approveBtn.onclick = async () => {
        await updateLeadApplicationStatus(lead.id, "accepted", lead);
        closeLeadStudentModal();
    };

    rejectBtn.onclick = async () => {
        await updateLeadApplicationStatus(lead.id, "rejected", lead);
        closeLeadStudentModal();
    };

    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("show"), 10);
    lucide.createIcons();
}

function closeLeadStudentModal() {
    const modal = document.getElementById("student-profile-modal");
    if (!modal) return;
    modal.classList.remove("show");
    setTimeout(() => {
        modal.style.display = "none";
    }, 200);
}

async function updateLeadApplicationStatus(appId, newStatus, leadObj) {
    try {
        const res = await fetch(`${API_BASE}/api/v1/applications/${appId}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        });
        if (!res.ok) throw new Error("Status update failed");
        showToast(newStatus === "accepted" ? "🎉 Заявка абитуриента успешно одобрена!" : "Заявка отклонена", newStatus === "accepted" ? "success" : "info");
        if (leadObj) leadObj.status = newStatus;
        renderLeadsTable();
    } catch (err) {
        showToast("Ошибка при изменении статуса заявки", "danger");
    }
}

const MAIN_EXAM_TYPES = [
    { label: "+ IELTS", prefix: "IELTS", type: "score", placeholder: "например 6.5" },
    { label: "+ SAT", prefix: "SAT", type: "score", placeholder: "например 1200" },
    { label: "+ GPA", prefix: "GPA", type: "score", placeholder: "например 4.5" },
    { label: "+ Экзамен по математике", prefix: "Экзамен по математике", type: "direct" },
    { label: "+ Собеседование", prefix: "Собеседование", type: "direct" },
    { label: "+ Аттестат / Диплом", prefix: "Аттестат / Диплом", type: "direct" }
];

// 12. Specialties Constructor Row rendering
let currentSpecialties = [];
function renderWizardSpecialties() {
    const container = document.getElementById("wizard-specialties-container");
    container.innerHTML = "";
    
    if (currentSpecialties.length === 0) {
        addSpecialtyRow();
        return;
    }
    
    currentSpecialties.forEach((spec, idx) => {
        const row = document.createElement("div");
        row.className = "specialty-constructor-card";
        row.style.background = "var(--bg-accent)";
        row.style.padding = "1.25rem";
        row.style.borderRadius = "12px";
        row.style.border = "1px solid var(--card-border)";
        row.style.display = "flex";
        row.style.flexDirection = "column";
        row.style.gap = "1rem";
        row.style.position = "relative";
        
        if (!spec.reqTags) {
            spec.reqTags = spec.min_requirements ? spec.min_requirements.split(",").map(s => s.trim()).filter(Boolean) : ["IELTS 6.0"];
        }

        const tagsHtml = spec.reqTags.map((tag, tIdx) => `
            <span class="req-tag-chip" style="display: inline-flex; align-items: center; gap: 0.35rem; background: var(--card-bg); border: 1px solid var(--card-border); padding: 0.25rem 0.6rem; border-radius: 8px; font-size: 0.85rem; font-weight: 500;">
                ${tag}
                <button type="button" class="remove-tag-btn" data-tag-idx="${tIdx}" style="background: none; border: none; cursor: pointer; color: var(--text-secondary); font-size: 1rem; line-height: 1; padding: 0 2px;">&times;</button>
            </span>
        `).join("");

        row.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h5 style="margin: 0; font-weight: 700; font-size: 1rem; color: var(--primary);">Специальность #${idx + 1}</h5>
                <button type="button" class="btn btn-outline spec-delete-btn" style="padding: 0.35rem 0.75rem; border-color: rgba(255,77,79,0.3); color: #ff4d4f; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.35rem;" title="Удалить направление">
                    <i data-lucide="trash-2" style="width:14px; height:14px;"></i> Удалить
                </button>
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:0.75rem; margin-bottom:4px; font-weight:600;">Название направления <span class="required">*</span></label>
                    <input type="text" class="spec-name-input" value="${spec.name || ''}" placeholder="Информационные технологии и ИИ" required style="width: 100%;">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:0.75rem; margin-bottom:4px; font-weight:600;">Стоимость ($ / год) <span class="required">*</span></label>
                    <input type="number" class="spec-fee-input" value="${spec.tuition_fee || ''}" placeholder="4000" required style="width: 100%;">
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:0.75rem; margin-bottom:4px; font-weight:600;">Форма обучения</label>
                    <select class="spec-format-input" style="width: 100%; font-size: 0.85rem; padding: 0.45rem 0.6rem; border-radius: 8px; border: 1px solid var(--card-border); background: var(--bg); color: var(--text-primary);">
                        <option value="Очный (Дневной)" ${(spec.format === 'Очный (Дневной)' || !spec.format) ? 'selected' : ''}>Очный (Дневной)</option>
                        <option value="Дистанционный (Онлайн)" ${spec.format === 'Дистанционный (Онлайн)' ? 'selected' : ''}>Дистанционный (Онлайн)</option>
                        <option value="Заочный" ${spec.format === 'Заочный' ? 'selected' : ''}>Заочный</option>
                        <option value="Вечерний" ${spec.format === 'Вечерний' ? 'selected' : ''}>Вечерний</option>
                        <option value="Гибридный" ${spec.format === 'Гибридный' ? 'selected' : ''}>Гибридный</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:0.75rem; margin-bottom:4px; font-weight:600;">Срок обучения</label>
                    <input type="text" class="spec-duration-input" value="${spec.duration || '4 года (Бакалавриат)'}" placeholder="4 года" style="width: 100%; font-size: 0.85rem; padding: 0.45rem 0.6rem; border-radius: 8px; border: 1px solid var(--card-border); background: var(--bg); color: var(--text-primary);">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:0.75rem; margin-bottom:4px; font-weight:600;">Язык обучения</label>
                    <input type="text" class="spec-language-input" value="${spec.language || 'Английский / Русский'}" placeholder="Английский" style="width: 100%; font-size: 0.85rem; padding: 0.45rem 0.6rem; border-radius: 8px; border: 1px solid var(--card-border); background: var(--bg); color: var(--text-primary);">
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.65rem; background: var(--card-bg); padding: 1rem; border-radius: 12px; border: 1px dashed var(--card-border);">
                <label style="font-size:0.85rem; font-weight:700; color: var(--text-primary);">Минимальные требования к абитуриенту</label>

                <!-- Active Tags -->
                <div class="req-tags-container" style="display: flex; flex-wrap: wrap; gap: 0.5rem; min-height: 28px;">
                    ${tagsHtml || '<span style="font-size:0.8rem; color: var(--text-muted);">Требования пока не добавлены</span>'}
                </div>

                <!-- Main Exam Types -->
                <div style="margin-top: 0.35rem; padding-top: 0.5rem; border-top: 1px solid var(--card-border);">
                    <span style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 0.35rem; font-weight: 500;">Выберите вид экзамена:</span>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                        ${MAIN_EXAM_TYPES.map((exam, eIdx) => `
                            <button type="button" class="exam-type-chip" data-exam-idx="${eIdx}" style="background: var(--bg-accent); border: 1px solid var(--card-border); padding: 0.3rem 0.7rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; cursor: pointer; color: var(--text-primary);">
                                ${exam.label}
                            </button>
                        `).join("")}
                    </div>
                </div>

                <!-- Score Input Box (hidden by default, opens on exam click) -->
                <div class="score-input-box" style="display: none; gap: 0.5rem; margin-top: 0.35rem; background: var(--bg-accent); padding: 0.6rem; border-radius: 8px; align-items: center;">
                    <span class="selected-exam-name" style="font-size: 0.85rem; font-weight: 700; color: var(--primary);">IELTS</span>
                    <input type="text" class="score-val-input" placeholder="например 6.5" style="flex: 1; padding: 0.4rem 0.65rem; font-size: 0.85rem; border-radius: 6px; border: 1px solid var(--card-border); background: var(--card-bg); color: var(--text-primary);">
                    <button type="button" class="confirm-score-btn btn btn-primary btn-sm" style="padding: 0.4rem 0.75rem; font-size: 0.8rem;">Добавить</button>
                </div>

                <!-- Custom requirement input -->
                <div style="display: flex; gap: 0.5rem; margin-top: 0.35rem;">
                    <input type="text" class="new-req-input" placeholder="Или введите своё требование..." style="flex: 1; padding: 0.45rem 0.75rem; font-size: 0.85rem; border-radius: 8px; border: 1px solid var(--card-border); background: var(--bg); color: var(--text-primary);">
                    <button type="button" class="add-req-tag-btn btn btn-outline btn-sm" style="padding: 0.45rem 0.85rem; font-size: 0.8rem; border-color: var(--primary); color: var(--primary); font-weight: 600; white-space: nowrap;">
                        + Своё требование
                    </button>
                </div>
            </div>
        `;
        
        row.querySelector(".spec-name-input").addEventListener("input", (e) => {
            spec.name = e.target.value;
            syncWizardLivePreview();
        });
        row.querySelector(".spec-fee-input").addEventListener("input", (e) => {
            spec.tuition_fee = e.target.value;
            syncWizardLivePreview();
        });
        row.querySelector(".spec-format-input").addEventListener("change", (e) => {
            spec.format = e.target.value;
            syncWizardLivePreview();
        });
        row.querySelector(".spec-duration-input").addEventListener("input", (e) => {
            spec.duration = e.target.value;
            syncWizardLivePreview();
        });
        row.querySelector(".spec-language-input").addEventListener("input", (e) => {
            spec.language = e.target.value;
            syncWizardLivePreview();
        });

        const scoreBox = row.querySelector(".score-input-box");
        const selectedExamName = row.querySelector(".selected-exam-name");
        const scoreValInput = row.querySelector(".score-val-input");
        const confirmScoreBtn = row.querySelector(".confirm-score-btn");
        let activeExamPrefix = "";

        row.querySelectorAll(".exam-type-chip").forEach(btn => {
            btn.addEventListener("click", () => {
                const eIdx = parseInt(btn.dataset.examIdx);
                const exam = MAIN_EXAM_TYPES[eIdx];
                if (!exam) return;

                if (exam.type === "direct") {
                    if (!spec.reqTags.includes(exam.prefix)) {
                        spec.reqTags.push(exam.prefix);
                        spec.min_requirements = spec.reqTags.join(", ");
                        renderWizardSpecialties();
                        syncWizardLivePreview();
                    }
                } else {
                    activeExamPrefix = exam.prefix;
                    selectedExamName.textContent = `${exam.prefix}:`;
                    scoreValInput.placeholder = exam.placeholder;
                    scoreValInput.value = "";
                    scoreBox.style.display = "flex";
                    scoreValInput.focus();
                }
            });
        });

        const addScoreTag = () => {
            const val = scoreValInput ? scoreValInput.value.trim() : "";
            if (activeExamPrefix && val) {
                const fullTag = `${activeExamPrefix} ${val}`;
                if (!spec.reqTags.includes(fullTag)) {
                    spec.reqTags.push(fullTag);
                    spec.min_requirements = spec.reqTags.join(", ");
                    renderWizardSpecialties();
                    syncWizardLivePreview();
                }
            }
        };

        if (confirmScoreBtn) confirmScoreBtn.addEventListener("click", addScoreTag);
        if (scoreValInput) {
            scoreValInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    addScoreTag();
                }
            });
        }

        const reqInput = row.querySelector(".new-req-input");
        const addBtn = row.querySelector(".add-req-tag-btn");

        const addRequirement = () => {
            const val = reqInput ? reqInput.value.trim() : "";
            if (val) {
                spec.reqTags.push(val);
                spec.min_requirements = spec.reqTags.join(", ");
                renderWizardSpecialties();
                syncWizardLivePreview();
            }
        };

        if (addBtn) addBtn.addEventListener("click", addRequirement);
        if (reqInput) {
            reqInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    addRequirement();
                }
            });
        }

        row.querySelectorAll(".remove-tag-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const tIdx = parseInt(e.target.dataset.tagIdx);
                spec.reqTags.splice(tIdx, 1);
                spec.min_requirements = spec.reqTags.join(", ");
                renderWizardSpecialties();
                syncWizardLivePreview();
            });
        });
        
        row.querySelector(".spec-delete-btn").addEventListener("click", () => {
            currentSpecialties.splice(idx, 1);
            renderWizardSpecialties();
            syncWizardLivePreview();
        });
        
        container.appendChild(row);
    });
    lucide.createIcons();
    syncWizardLivePreview();
}

function addSpecialtyRow() {
    currentSpecialties.push({ name: "", tuition_fee: "", min_requirements: "IELTS 6.0", reqTags: ["IELTS 6.0"] });
    renderWizardSpecialties();
}

// 13. Searchable Dropdowns Autocomplete helper
function setupAutocomplete(inputId, dropdownId, list) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    const renderList = (items) => {
        dropdown.innerHTML = "";
        if (items.length === 0) {
            dropdown.style.display = "none";
            return;
        }
        items.forEach(item => {
            const div = document.createElement("div");
            div.className = "autocomplete-item";
            div.style.padding = "0.75rem 1rem";
            div.style.cursor = "pointer";
            div.style.borderBottom = "1px solid rgba(102,2,60,0.03)";
            div.style.fontSize = "0.9rem";
            div.style.color = "var(--text-primary)";
            div.textContent = item;

            div.addEventListener("click", () => {
                input.value = item;
                dropdown.style.display = "none";
            });
            div.addEventListener("mouseenter", () => {
                div.style.background = "rgba(202, 209, 131, 0.15)";
            });
            div.addEventListener("mouseleave", () => {
                div.style.background = "";
            });

            dropdown.appendChild(div);
        });
        dropdown.style.display = "block";
    };

    input.addEventListener("focus", () => {
        const val = input.value.trim().toLowerCase();
        if (!val) {
            renderList(list);
        } else {
            const filtered = list.filter(item => item.toLowerCase().includes(val));
            renderList(filtered);
        }
    });

    input.addEventListener("input", () => {
        const val = input.value.trim().toLowerCase();
        const filtered = list.filter(item => item.toLowerCase().includes(val));
        renderList(filtered);
    });

    document.addEventListener("click", (e) => {
        if (e.target !== input && e.target !== dropdown && !dropdown.contains(e.target)) {
            dropdown.style.display = "none";
        }
    });
}

// Popular constants lists for university search autocomplete
const POPULAR_UNIVERSITIES = [
    "Massachusetts Institute of Technology (MIT)",
    "Stanford University",
    "Harvard University",
    "University of Oxford",
    "University of Cambridge",
    "ETH Zurich - Swiss Federal Institute of Technology",
    "National University of Singapore (NUS)",
    "Lomonosov Moscow State University (MSU)",
    "Higher School of Economics (HSE)",
    "Moscow Institute of Physics and Technology (MIPT)",
    "Saint Petersburg State University (SPbSU)"
];

const COUNTRIES = [
    "Австралия", "Австрия", "Азербайджан", "Албания", "Алжир", "Ангола", "Андорра", "Аргентина", "Армения", "Афганистан",
    "Багамы", "Бангладеш", "Беларусь", "Бельгия", "Болгария", "Боливия", "Босния и Герцеговина", "Бразилия", "Бруней",
    "Венгрия", "Венесуэла", "Вьетнам", "Габон", "Гаити", "Гана", "Гватемала", "Германия", "Гондурас", "Гонконг", "Греция", "Грузия",
    "Дания", "Доминикана", "Египет", "Израиль", "Индия", "Индонезия", "Иордания", "Ирак", "Иран", "Ирландия", "Исландия", "Испания", "Италия",
    "Казахстан", "Камбоджа", "Камерун", "Канада", "Катар", "Кения", "Кипр", "Киргизия", "Китай", "Колумбия", "Коста-Рика", "Куба",
    "Латвия", "Ливан", "Ливия", "Литва", "Лихтенштейн", "Люксембург", "Малайзия", "Мальта", "Марокко", "Мексика", "Молдова", "Монако", "Монголия",
    "Непал", "Нигерия", "Нидерланды", "Новая Зеландия", "Норвегия", "ОАЭ", "Оман", "Пакистан", "Панама", "Парагвай", "Перу", "Польша", "Португалия",
    "Россия", "Румыния", "Саудовская Аравия", "Северная Македония", "Сербия", "Сингапур", "Словакия", "Словения", "США",
    "Таджикистан", "Таиланд", "Тайвань", "Тунис", "Турция", "Туркменистан", "Уганда", "Узбекистан", "Украина", "Уругвай",
    "Филиппины", "Финляндия", "Франция", "Хорватия", "Черногория", "Чехия", "Чили", "Швейцария", "Швеция", "Шри-Ланка",
    "Эквадор", "Эстония", "Эфиопия", "ЮАР", "Южная Корея", "Япония"
];

// Helper: Chart.js visualization
function renderTelemetryChart(chartData) {
    const ctx = document.getElementById("dashboard-chart").getContext("2d");
    
    const labels = chartData.map(item => item.date);
    const views = chartData.map(item => item.views);
    const apps = chartData.map(item => item.applications);

    const isDark = document.body.classList.contains("dark-theme");
    const textColor = isDark ? "#A396A6" : "#5C4E5E";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(102, 2, 60, 0.04)";
    const primaryColor = isDark ? "#CAD183" : "#66023C";
    const primaryBg = isDark ? "rgba(202, 209, 131, 0.05)" : "rgba(102, 2, 60, 0.05)";
    const secondaryColor = isDark ? "#8A3C6D" : "#CAD183";

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Заявки (Лиды)",
                    data: apps,
                    borderColor: primaryColor,
                    backgroundColor: primaryBg,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.35,
                    yAxisID: "y-apps"
                },
                {
                    label: "Просмотры",
                    data: views,
                    borderColor: secondaryColor,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.35,
                    yAxisID: "y-views"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: textColor,
                        font: { family: "Inter", size: 12 }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                "y-apps": {
                    position: "left",
                    grid: { color: gridColor },
                    ticks: { color: primaryColor },
                    title: { display: true, text: "Количество заявок", color: primaryColor }
                },
                "y-views": {
                    position: "right",
                    grid: { drawOnChartArea: false },
                    ticks: { color: textColor },
                    title: { display: true, text: "Просмотры профиля", color: textColor }
                }
            }
        }
    });
}

// Dynamically updates chart colors on theme switch
function updateChartColors(isDark) {
    if (!chartInstance) return;
    const textColor = isDark ? "#A396A6" : "#5C4E5E";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(102, 2, 60, 0.04)";
    const primaryColor = isDark ? "#CAD183" : "#66023C";
    const secondaryColor = isDark ? "#8A3C6D" : "#CAD183";
    const primaryBg = isDark ? "rgba(202, 209, 131, 0.05)" : "rgba(102, 2, 60, 0.05)";

    // Update datasets
    chartInstance.data.datasets[0].borderColor = primaryColor;
    chartInstance.data.datasets[0].backgroundColor = primaryBg;
    chartInstance.data.datasets[1].borderColor = secondaryColor;

    // Update scale ticks and grids
    chartInstance.options.plugins.legend.labels.color = textColor;
    chartInstance.options.scales.x.ticks.color = textColor;
    chartInstance.options.scales.x.grid.color = gridColor;
    chartInstance.options.scales["y-apps"].ticks.color = primaryColor;
    chartInstance.options.scales["y-apps"].grid.color = gridColor;
    chartInstance.options.scales["y-apps"].title.color = primaryColor;
    chartInstance.options.scales["y-views"].ticks.color = textColor;
    chartInstance.options.scales["y-views"].title.color = textColor;
    
    chartInstance.update();
}



// Initialize dynamic Grainient background
function initBackground() {
    // Disabled dynamic gradient background for monochrome style
}

// Render Live Preview inside Onboarding Wizard Modal
function showWizardLivePreview() {
    const previewModal = document.getElementById("wb-preview-modal");
    const container = document.getElementById("modal-preview-container");
    if (!previewModal || !container) return;

    // Extract current inputs from wizard Step 1
    const name = document.getElementById("wizard-name").value.trim() || "Название ВУЗа";
    const country = document.getElementById("wizard-country").value.trim() || "Страна";
    const city = document.getElementById("wizard-city").value.trim() || "Город";
    const website = document.getElementById("wizard-website").value.trim() || "https://university.edu";
    const description = document.getElementById("wizard-description").value.trim() || "Описание университета появится здесь...";
    const minIelts = document.getElementById("wizard-ielts").value.trim() || "—";
    const minSat = document.getElementById("wizard-sat").value.trim() || "—";
    const slogan = document.getElementById("wizard-slogan").value.trim() || "Слоган университета";
    
    const adv1Title = document.getElementById("wizard-adv-1-title").value.trim() || "Преимущество 1";
    const adv1Desc = document.getElementById("wizard-adv-1-desc").value.trim() || "Описание преимущества";
    const adv2Title = document.getElementById("wizard-adv-2-title").value.trim() || "Преимущество 2";
    const adv2Desc = document.getElementById("wizard-adv-2-desc").value.trim() || "Описание преимущества";
    const adv3Title = document.getElementById("wizard-adv-3-title").value.trim() || "Преимущество 3";
    const adv3Desc = document.getElementById("wizard-adv-3-desc").value.trim() || "Описание преимущества";

    // Build specialties options grid
    let specGridHtml = "";
    if (currentSpecialties && currentSpecialties.length > 0) {
        currentSpecialties.forEach(spec => {
            const specName = spec.name.trim() || "Название направления";
            const specCode = spec.code ? spec.code.trim() : "";
            const tuitionDisplay = spec.tuition_fee ? `$${parseInt(spec.tuition_fee).toLocaleString()}/год` : "$1,500/год";
            const reqs = spec.min_requirements ? `Требования: ${spec.min_requirements}` : "Стандартные требования к поступлению";

            specGridHtml += `
                <div class="wb-spec-option glass-card" style="pointer-events: none; min-height: 190px;">
                    <div class="wb-spec-opt-header">
                        <span class="wb-spec-opt-name">${specName}</span>
                        ${specCode ? `<span class="wb-spec-opt-code">${specCode}</span>` : ""}
                    </div>
                    <div class="wb-spec-opt-fee">${tuitionDisplay}</div>
                    <p class="wb-spec-opt-reqs">${reqs}</p>
                    <div class="wb-spec-opt-action">
                        <span>Выбрать специальность</span>
                        <i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i>
                    </div>
                </div>
            `;
        });
    } else {
        specGridHtml = `<div style="grid-column: 1 / -1; color: var(--text-secondary); text-align: center; padding: 2rem;">Специальности пока не добавлены. Заполните Шаг 2 конструктора.</div>`;
    }

    // Alias generation (first letters of words, e.g. MIT)
    const words = name.split(" ");
    const alias = words.map(w => w[0] ? w[0] : "").join("").toUpperCase().substring(0, 4);

    // Calculate price range tag
    let priceRangeText = "от $1,500 / год";
    if (currentSpecialties && currentSpecialties.length > 0) {
        const fees = currentSpecialties.map(s => parseFloat(s.tuition_fee)).filter(f => !isNaN(f));
        if (fees.length > 0) {
            const minFee = Math.min(...fees);
            priceRangeText = `от $${minFee.toLocaleString()}/год`;
        }
    }

    const shortWeb = website.replace("https://", "").replace("http://", "").split("/")[0] || "website.edu";

    // Build the Wildberries layout
    container.innerHTML = `
        <div class="wb-product-container">
            
            <!-- Left Column: Gallery, Price Card, Specs -->
            <div class="wb-product-gallery-side">
                <!-- Academic Style Banner / Cover -->
                <div class="wb-product-banner academic-banner-style">
                    <div class="banner-overlay"></div>
                    <div class="banner-content">
                        <span class="banner-tag">LIVE PREVIEW</span>
                        <span class="banner-alias">${alias || "UNI"}</span>
                    </div>
                </div>

                <!-- Price Card ("Buy" Box) -->
                <div class="wb-price-card glass-card">
                    <div class="wb-price-row">
                        <span class="price-label">Стоимость обучения</span>
                        <h2 class="price-value">${priceRangeText}</h2>
                    </div>
                    
                    <div class="wb-fast-apply-badge">
                        <i data-lucide="zap" style="color: var(--primary);"></i>
                        <span>Мгновенная подача через Digital ID</span>
                    </div>

                    <button class="btn btn-primary btn-full" style="padding: 1rem; font-size: 1.1rem; font-weight: 600; margin-top: 1.25rem; pointer-events: none;">
                        Подать документы
                    </button>
                </div>

                <!-- Specifications Table -->
                <div class="wb-specs-card glass-card">
                    <h3>Характеристики ВУЗа</h3>
                    <div class="wb-specs-list">
                        <div class="wb-spec-item">
                            <span class="wb-spec-name">Страна</span>
                            <span class="wb-spec-value">${country}</span>
                        </div>
                        <div class="wb-spec-item">
                            <span class="wb-spec-name">Город</span>
                            <span class="wb-spec-value">${city}</span>
                        </div>
                        <div class="wb-spec-item">
                            <span class="wb-spec-name">Сайт</span>
                            <span class="wb-spec-value link">${shortWeb}</span>
                        </div>
                        <div class="wb-spec-item">
                            <span class="wb-spec-name">IELTS</span>
                            <span class="wb-spec-value">${minIelts}</span>
                        </div>
                        <div class="wb-spec-item">
                            <span class="wb-spec-name">SAT</span>
                            <span class="wb-spec-value">${minSat}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Column: Slogan, Description, Advantages, Specialties Selection -->
            <div class="wb-product-info-side">
                <!-- Title & Slogan Section -->
                <div class="wb-title-card glass-card">
                    <span class="badge badge-success">Верифицирован приемной комиссией</span>
                    <h1 style="font-family: var(--font-heading); font-size: 2.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; line-height: 1.2;">${name}</h1>
                    <p class="wb-slogan">${slogan}</p>
                </div>

                <!-- Description Card -->
                <div class="wb-desc-card glass-card">
                    <h3>Описание университета</h3>
                    <p>${description}</p>
                </div>

                <!-- Advantages Grid (3 Cards) -->
                <div class="wb-advantages-section">
                    <h3>Ключевые преимущества</h3>
                    <div class="wb-advantages-grid">
                        <div class="wb-adv-card glass-card">
                            <i data-lucide="sparkles" class="wb-adv-icon"></i>
                            <h4>${adv1Title}</h4>
                            <p>${adv1Desc}</p>
                        </div>
                        <div class="wb-adv-card glass-card">
                            <i data-lucide="graduation-cap" class="wb-adv-icon"></i>
                            <h4>${adv2Title}</h4>
                            <p>${adv2Desc}</p>
                        </div>
                        <div class="wb-adv-card glass-card">
                            <i data-lucide="home" class="wb-adv-icon"></i>
                            <h4>${adv3Title}</h4>
                            <p>${adv3Desc}</p>
                        </div>
                    </div>
                </div>

                <!-- Specialties Selection Grid -->
                <div class="wb-specialties-selection glass-card">
                    <h3>Выберите направление обучения</h3>
                    <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1.25rem;">Ознакомьтесь с доступными программами обучения и стоимостью за академический год:</p>
                    
                    <div class="wb-spec-grid">
                        ${specGridHtml}
                    </div>
                </div>
            </div>

        </div>
    `;

    // Show overlay modal
    previewModal.style.display = "flex";
    lucide.createIcons();
}

// --- 16. ONBOARDING INTRO OVERLAY SYSTEM ---

function showOnboardingOverlay() {
    const overlay = document.getElementById("onboarding-overlay");
    if (!overlay) return;

    // Reset steps
    document.querySelectorAll(".onboard-step").forEach(step => step.classList.remove("active"));
    document.getElementById("onboard-step-1").classList.add("active");
    updateStepper(1);

    // Clear form inputs
    document.getElementById("onboard-val-ielts").value = "";
    document.getElementById("onboard-val-sat").value = "";
    document.getElementById("onboard-val-gpa").value = "";
    document.getElementById("onboard-val-name").value = "";
    document.getElementById("onboard-val-birthday").value = "";
    document.getElementById("onboard-val-phone").value = "";
    
    const loginPhone = document.getElementById("onboard-login-phone");
    if (loginPhone) loginPhone.value = "";

    overlay.style.display = "flex";
    overlay.style.opacity = "1";
    
    // Init Lucide icons in onboarding overlay if any
    lucide.createIcons();
}

function hideOnboardingOverlay() {
    const overlay = document.getElementById("onboarding-overlay");
    if (!overlay) return;

    overlay.style.opacity = "0";
    setTimeout(() => {
        overlay.style.display = "none";
    }, 500);
}

function initStudentSession() {
    const savedPhone = localStorage.getItem("currentStudentPhone");
    if (savedPhone) {
        document.getElementById("auth-phone-input").value = savedPhone;
        loadStudentProfile(savedPhone, false);
    } else {
        showOnboardingOverlay();
        resetPassportCard("");
    }
}

function formatDate(dateString) {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function updateProfileFormUI() {
    const uniSelect = document.getElementById("form-university");
    const specSelect = document.getElementById("form-specialty");
    const banner = document.getElementById("target-university-banner");
    const uniNameSpan = document.getElementById("banner-uni-name");
    const specNameSpan = document.getElementById("banner-spec-name");
    const submitBtn = document.getElementById("submit-application-btn");
    const fileInput = document.getElementById("form-file");
    const subtitle = document.getElementById("profile-form-subtitle");

    if (!uniSelect || !specSelect || !banner || !submitBtn || !fileInput || !subtitle) return;

    // Show/hide global logout button in header
    const globalLogoutBtn = document.getElementById("global-logout-btn");
    if (globalLogoutBtn) {
        const savedPhone = localStorage.getItem("currentStudentPhone");
        globalLogoutBtn.style.display = savedPhone ? "inline-flex" : "none";
    }

    const specGroup = document.getElementById("form-specialty-group");

    if (uniSelect.value) {
        // We are applying to a university
        banner.style.display = "block";
        if (specGroup) specGroup.style.display = "block";
        
        const selectedUniOpt = uniSelect.options[uniSelect.selectedIndex];
        uniNameSpan.textContent = selectedUniOpt ? selectedUniOpt.textContent : "Выбранный университет";
        
        const selectedSpecOpt = specSelect.options[specSelect.selectedIndex];
        specNameSpan.textContent = (selectedSpecOpt && specSelect.value) ? selectedSpecOpt.textContent : "Выберите специальность...";

        subtitle.textContent = "Заполните документы для отправки в выбранный университет.";
        submitBtn.innerHTML = `<i data-lucide="send" class="btn-icon"></i>Подать заявку в университет`;
        fileInput.required = true;
        specSelect.required = true;
    } else {
        // We are just editing profile
        banner.style.display = "none";
        if (specGroup) specGroup.style.display = "none";
        subtitle.textContent = "Заполните поля ниже, чтобы обновить ваши данные.";
        submitBtn.innerHTML = `<i data-lucide="save" class="btn-icon"></i>Сохранить профиль`;
        fileInput.required = false;
        specSelect.required = false;
    }
    lucide.createIcons();
}

function updateStepper(step) {
    const stepperRow = document.getElementById("onboard-stepper-row");
    const loginTrigger = document.getElementById("onboard-login-trigger");
    
    if (loginTrigger) {
        loginTrigger.style.display = (step === 1) ? "flex" : "none";
    }

    if (!stepperRow) return;

    if (step === 'login') {
        stepperRow.style.display = "none";
        return;
    } else {
        stepperRow.style.display = "flex";
    }

    const totalSteps = 3;
    for (let i = 1; i <= totalSteps; i++) {
        const ind = document.getElementById(`step-ind-${i}`);
        if (!ind) continue;
        
        const inner = ind.querySelector(".step-indicator-inner");
        const num = ind.querySelector(".step-number");
        const dot = ind.querySelector(".active-dot");
        const check = ind.querySelector(".check-icon");

        ind.className = "step-indicator";
        if (i < step) {
            // Completed
            ind.classList.add("complete");
            if (num) num.style.display = "none";
            if (dot) dot.style.display = "none";
            if (check) check.style.display = "block";
        } else if (i === step) {
            // Active
            ind.classList.add("active");
            if (num) num.style.display = "none";
            if (dot) dot.style.display = "block";
            if (check) check.style.display = "none";
        } else {
            // Inactive
            ind.classList.add("inactive");
            if (num) num.style.display = "block";
            if (dot) dot.style.display = "none";
            if (check) check.style.display = "none";
        }

        // Connector lines progress animation
        if (i < totalSteps) {
            const connInner = document.getElementById(`step-conn-inner-${i}`);
            if (connInner) {
                if (i < step) {
                    connInner.style.width = "100%";
                } else {
                    connInner.style.width = "0%";
                }
            }
        }
    }
    lucide.createIcons();
}

function syncWizardLivePreview() {
    const name = document.getElementById("wizard-name") ? document.getElementById("wizard-name").value.trim() : "";
    const country = document.getElementById("wizard-country") ? document.getElementById("wizard-country").value.trim() : "";
    const city = document.getElementById("wizard-city") ? document.getElementById("wizard-city").value.trim() : "";
    const website = document.getElementById("wizard-website") ? document.getElementById("wizard-website").value.trim() : "";
    const description = document.getElementById("wizard-description") ? document.getElementById("wizard-description").value.trim() : "";
    const slogan = document.getElementById("wizard-slogan") ? document.getElementById("wizard-slogan").value.trim() : "";
    const ielts = document.getElementById("wizard-ielts") ? document.getElementById("wizard-ielts").value.trim() : "";
    const sat = document.getElementById("wizard-sat") ? document.getElementById("wizard-sat").value.trim() : "";
    
    // 1. Text mappings
    const previewName = document.getElementById("preview-det-uni-name");
    const previewSlogan = document.getElementById("preview-det-uni-slogan");
    const previewDesc = document.getElementById("preview-det-uni-desc");
    const previewCountry = document.getElementById("preview-det-spec-country");
    const previewCity = document.getElementById("preview-det-spec-city");
    const previewWebsite = document.getElementById("preview-det-spec-website");
    const previewIelts = document.getElementById("preview-det-spec-ielts");
    const previewSat = document.getElementById("preview-det-spec-sat");

    if (previewName) previewName.textContent = name || "Название ВУЗа";
    if (previewSlogan) previewSlogan.textContent = slogan || "Слоган университета";
    if (previewDesc) previewDesc.textContent = description || "Заполните описание университета...";
    if (previewCountry) previewCountry.textContent = country || "—";
    if (previewCity) previewCity.textContent = city || "—";
    if (previewWebsite) previewWebsite.textContent = website || "не указан";
    if (previewIelts) previewIelts.textContent = ielts || "—";
    if (previewSat) previewSat.textContent = sat || "—";

    // 2. Render advantages in live preview dynamically (no icons)
    renderUniversityAdvantages(null, "preview-advantages-container", true);

    // 2. Banner Alias/Photo
    const aliasSpan = document.getElementById("preview-det-uni-alias");
    const bannerBg = document.getElementById("preview-banner-bg");
    if (aliasSpan && bannerBg) {
        const words = name.split(" ");
        const alias = words.map(w => w[0] ? w[0] : "").join("").toUpperCase().substring(0, 4);
        aliasSpan.textContent = alias || "UNI";

        if (wizardPhotoBase64 && wizardPhotoBase64.startsWith("data:image/")) {
            bannerBg.style.backgroundImage = `url('${wizardPhotoBase64}')`;
            bannerBg.style.backgroundSize = "cover";
            bannerBg.style.backgroundPosition = "center";
            aliasSpan.style.display = "none";
        } else {
            bannerBg.style.backgroundImage = "";
            bannerBg.style.backgroundSize = "";
            bannerBg.style.backgroundPosition = "";
            aliasSpan.style.display = "block";
        }
    }

    // 3. Price Card
    const previewPrice = document.getElementById("preview-det-uni-price");
    if (previewPrice) {
        if (currentSpecialties && currentSpecialties.length > 0) {
            const fees = currentSpecialties.map(s => parseFloat(s.tuition_fee)).filter(f => !isNaN(f));
            if (fees.length > 0) {
                const minFee = Math.min(...fees);
                previewPrice.textContent = `от $${minFee.toLocaleString()}/год`;
            } else {
                previewPrice.textContent = "от $— / год";
            }
        } else {
            previewPrice.textContent = "от $— / год";
        }
    }
}

// Render dynamic filled advantages in student view (no icons, pure monochrome)
function renderUniversityAdvantages(uni, containerId, isPreview = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";

    const advs = [];
    if (isPreview) {
        currentAdvantages.forEach(a => {
            if (a.title && a.title.trim()) advs.push(a);
        });
    } else if (uni) {
        if (uni.adv_1_title && uni.adv_1_title.trim()) advs.push({ title: uni.adv_1_title, desc: uni.adv_1_desc });
        if (uni.adv_2_title && uni.adv_2_title.trim()) advs.push({ title: uni.adv_2_title, desc: uni.adv_2_desc });
        if (uni.adv_3_title && uni.adv_3_title.trim()) advs.push({ title: uni.adv_3_title, desc: uni.adv_3_desc });
    }

    const section = container.closest(".wb-advantages-section");
    if (advs.length === 0) {
        if (section) section.style.display = "none";
    } else {
        if (section) section.style.display = "block";
        advs.forEach(adv => {
            const card = document.createElement("div");
            card.className = "wb-adv-card glass-card";
            card.style.padding = "1rem 1.25rem";
            card.style.textAlign = "left";
            card.innerHTML = `
                <h4 style="margin: 0; font-size: 1.05rem; font-weight: 600; color: var(--primary);">${adv.title}</h4>
                <p style="margin: 0.4rem 0 0 0; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">${adv.desc || ''}</p>
            `;
            container.appendChild(card);
        });
    }
}

// Render active partner wizard advantages rows (0 to 3)
function renderWizardAdvantages() {
    const container = document.getElementById("wizard-advantages-container");
    if (!container) return;
    container.innerHTML = "";

    currentAdvantages.forEach((adv, idx) => {
        const row = document.createElement("div");
        row.className = "advantage-constructor-row";
        row.style.display = "grid";
        row.style.gridTemplateColumns = "1fr 1.5fr auto";
        row.style.gap = "1rem";
        row.style.alignItems = "end";
        row.style.background = "var(--bg-accent)";
        row.style.padding = "1rem";
        row.style.borderRadius = "8px";
        row.style.border = "1px solid var(--card-border)";

        row.innerHTML = `
            <div class="form-group" style="margin-bottom:0;">
                <label style="font-size:0.75rem; margin-bottom:4px; font-weight:600;">Преимущество ${idx + 1}: Заголовок</label>
                <input type="text" class="adv-title-input" value="${adv.title || ''}" placeholder="100% трудоустройство" required style="width: 100%;">
            </div>
            <div class="form-group" style="margin-bottom:0;">
                <label style="font-size:0.75rem; margin-bottom:4px; font-weight:600;">Описание</label>
                <input type="text" class="adv-desc-input" value="${adv.desc || ''}" placeholder="Карьерный центр помогает найти работу" required style="width: 100%;">
            </div>
            <button type="button" class="btn btn-outline adv-delete-btn" style="padding: 0.75rem; border-color: var(--card-border); color: var(--text-secondary); height: 42px; width: 42px; display: inline-flex; align-items: center; justify-content: center;" title="Удалить преимущество">
                <i data-lucide="trash-2" style="width:16px; height:16px;"></i>
            </button>
        `;

        row.querySelector(".adv-title-input").addEventListener("input", (e) => {
            adv.title = e.target.value;
            syncWizardLivePreview();
        });
        row.querySelector(".adv-desc-input").addEventListener("input", (e) => {
            adv.desc = e.target.value;
            syncWizardLivePreview();
        });
        row.querySelector(".adv-delete-btn").addEventListener("click", () => {
            currentAdvantages.splice(idx, 1);
            renderWizardAdvantages();
            syncWizardLivePreview();
        });

        container.appendChild(row);
    });

    const addBtn = document.getElementById("wizard-add-adv-btn");
    if (addBtn) {
        if (currentAdvantages.length >= 3) {
            addBtn.style.display = "none";
        } else {
            addBtn.style.display = "inline-flex";
        }
    }
    
    lucide.createIcons();
}

// --- 13. AI CAREER ORIENTATION CHAT WIDGET ---
let aiChatHistory = [];
let isAiLoading = false;

function checkAiAuthStatus() {
    const savedPhone = localStorage.getItem("currentStudentPhone");
    const lockNotice = document.getElementById("ai-auth-locked-notice");
    const chatWrapper = document.getElementById("ai-profile-chat-wrapper");

    if (!lockNotice || !chatWrapper) return;

    if (savedPhone) {
        lockNotice.style.display = "none";
        chatWrapper.style.display = "flex";
        if (aiChatHistory.length === 0) {
            startAiChat();
        }
    } else {
        lockNotice.style.display = "block";
        chatWrapper.style.display = "none";
    }
}

function initAIOrientation() {
    const resetBtn = document.getElementById("reset-ai-chat-btn");
    const lockLoginBtn = document.getElementById("ai-lock-login-btn");
    const input = document.getElementById("ai-chat-input");
    const sendBtn = document.getElementById("ai-chat-send-btn");
    const counter = document.getElementById("ai-char-counter");

    // Check auth status initially
    checkAiAuthStatus();

    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            startAiChat();
            showToast("Диалог с ИИ-профориентатором сброшен", "info");
        });
    }

    if (lockLoginBtn) {
        lockLoginBtn.addEventListener("click", () => {
            const onboardModal = document.getElementById("onboarding-modal");
            if (onboardModal) {
                onboardModal.style.display = "flex";
                setTimeout(() => onboardModal.classList.add("show"), 10);
            }
        });
    }

    // Live Character Counter
    if (input && counter) {
        input.addEventListener("input", () => {
            const len = input.value.length;
            counter.textContent = `${len}/250`;
            if (len >= 250) {
                counter.style.color = "#ff4d4f";
            } else {
                counter.style.color = "var(--text-muted)";
            }
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendAiUserMessage();
            }
        });
    }

    if (sendBtn) {
        sendBtn.onclick = () => sendAiUserMessage();
    }
}

function startAiChat() {
    const initialText = "Привет! Я ИИ-гид платформы ТОТ. Помогу тебе понять, какая профессия и универ тебе реально подойдут.\n\nКак поступим: сделаем быстрый экспресс-тест на 4 вопроса или пройдем детальный разбор (7–8 вопросов), чтобы подобрать профессию максимально точно?";
    
    aiChatHistory = [];
    const messagesContainer = document.getElementById("ai-chat-messages");
    if (messagesContainer) messagesContainer.innerHTML = "";

    appendAiBubble(initialText);

    // Render initial mode selection buttons
    renderAiQuickButtons([
        { label: "⚡ Быстрый (4 вопроса)", text: "Выбираю быстрый экспресс-тест на 4 вопроса" },
        { label: "🎯 Детальный (7–8 вопросов)", text: "Выбираю детальный разбор на 7-8 вопросов" }
    ]);
}

function appendAiBubble(text) {
    const container = document.getElementById("ai-chat-messages");
    if (!container) return;

    const bubble = document.createElement("div");
    bubble.className = "ai-bubble";
    bubble.style.alignSelf = "flex-start";
    bubble.style.maxWidth = "85%";
    bubble.style.background = "var(--bg-accent)";
    bubble.style.border = "1px solid var(--card-border)";
    bubble.style.color = "var(--text-primary)";
    bubble.style.padding = "0.85rem 1.1rem";
    bubble.style.borderRadius = "16px 16px 16px 4px";
    bubble.style.fontSize = "0.9rem";
    bubble.style.lineHeight = "1.5";
    bubble.style.whiteSpace = "pre-line";

    bubble.textContent = text;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
}

function appendUserBubble(text) {
    const container = document.getElementById("ai-chat-messages");
    if (!container) return;

    const bubble = document.createElement("div");
    bubble.className = "user-bubble";
    bubble.style.alignSelf = "flex-end";
    bubble.style.maxWidth = "85%";
    bubble.style.background = "var(--text-primary)";
    bubble.style.color = "var(--bg)";
    bubble.style.padding = "0.85rem 1.1rem";
    bubble.style.borderRadius = "16px 16px 4px 16px";
    bubble.style.fontSize = "0.9rem";
    bubble.style.lineHeight = "1.5";
    bubble.style.fontWeight = "500";
    bubble.style.whiteSpace = "pre-line";

    bubble.textContent = text;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
}

function renderAiQuickButtons(buttons) {
    const container = document.getElementById("ai-quick-buttons");
    if (!container) return;

    container.innerHTML = "";
    if (!buttons || buttons.length === 0) return;

    buttons.forEach(btnInfo => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-outline btn-sm";
        btn.style.borderColor = "var(--card-border)";
        btn.style.color = "var(--text-primary)";
        btn.style.fontSize = "0.8rem";
        btn.style.fontWeight = "600";
        btn.style.padding = "0.4rem 0.85rem";
        btn.style.borderRadius = "20px";
        btn.style.cursor = "pointer";
        btn.textContent = btnInfo.label;

        btn.onclick = () => {
            container.innerHTML = "";
            sendAiUserMessage(btnInfo.text);
        };

        container.appendChild(btn);
    });
}

async function sendAiUserMessage(overrideText = null) {
    if (isAiLoading) return;

    const input = document.getElementById("ai-chat-input");
    const userText = overrideText ? overrideText.trim() : (input ? input.value.trim() : "");

    if (!userText) return;

    if (userText.length > 250) {
        showToast("Сообщение не должно превышать 250 символов", "danger");
        return;
    }

    if (input && !overrideText) {
        input.value = "";
        const counter = document.getElementById("ai-char-counter");
        if (counter) counter.textContent = "0/250";
    }

    // Clear quick action buttons once user responds
    const quickContainer = document.getElementById("ai-quick-buttons");
    if (quickContainer) quickContainer.innerHTML = "";

    appendUserBubble(userText);
    aiChatHistory.push({ role: "user", text: userText });

    // Show loading typing indicator
    isAiLoading = true;
    const container = document.getElementById("ai-chat-messages");
    const loadingBubble = document.createElement("div");
    loadingBubble.id = "ai-loading-bubble";
    loadingBubble.style.alignSelf = "flex-start";
    loadingBubble.style.padding = "0.6rem 1rem";
    loadingBubble.style.background = "var(--bg-accent)";
    loadingBubble.style.borderRadius = "16px";
    loadingBubble.style.fontSize = "0.85rem";
    loadingBubble.style.color = "var(--text-muted)";
    loadingBubble.style.fontStyle = "italic";
    loadingBubble.textContent = "ТОТ ИИ размышляет над ответом...";
    container.appendChild(loadingBubble);
    container.scrollTop = container.scrollHeight;

    try {
        // Natural human-like thinking delay (1.2 seconds)
        await new Promise(resolve => setTimeout(resolve, 1200));

        const res = await fetch(`${API_BASE}/api/ai-orientation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: userText,
                history: aiChatHistory.slice(-10) // Send last 10 messages for context
            })
        });

        const loadingElem = document.getElementById("ai-loading-bubble");
        if (loadingElem) loadingElem.remove();

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Ошибка получения ответа");

        const aiReply = data.reply || "Не удалось получить ответ.";
        appendAiBubble(aiReply);
        aiChatHistory.push({ role: "model", text: aiReply });

    } catch (err) {
        const loadingElem = document.getElementById("ai-loading-bubble");
        if (loadingElem) loadingElem.remove();
        
        appendAiBubble("Ошибка соединения с ИИ-сервером. Попробуйте еще раз.");
    } finally {
        isAiLoading = false;
    }
}

