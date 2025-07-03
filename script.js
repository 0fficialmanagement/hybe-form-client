// ModalManager: Enhanced with smooth transitions and robust management
class ModalManager {
  constructor() {
    this.activeModals = new Map();
    this.activeTimers = new Map();
  }

  initialize(modalId) {
    const element = document.getElementById(modalId);
    if (!element) {
      showGlobalError(`Modal ${modalId} not found`);
      return null;
    }
    try {
      const modal = new bootstrap.Modal(element);
      this.activeModals.set(modalId, modal);

      element.addEventListener(
        "hidden.bs.modal",
        () => {
          this.cleanup(modalId);
        },
        { once: true }
      );

      return modal;
    } catch (error) {
      showGlobalError(`Failed to initialize modal "${modalId}": ${error.message}`);
      return null;
    }
  }

  show(modalId, options = {}) {
    const modal = this.activeModals.get(modalId) || this.initialize(modalId);
    if (!modal) return;

    // Add smooth transition
    const element = document.getElementById(modalId);
    element.classList.add('modal-transition-in');
    setTimeout(() => {
      modal.show();
      element.classList.remove('modal-transition-in');
    }, 50);

    if (options.countdown) {
      this.setupCountdown(modalId, options.countdown);
    }

    // Add spinner timeout for processing modals
    if (modalId === 'validationModal' || modalId === 'paymentModal') {
      showSpinnerTimeout(modalId);
    }
  }

  hide(modalId) {
    const modal = this.activeModals.get(modalId);
    if (modal) {
      modal.hide();
    }
  }

  setupCountdown(modalId, { duration, elementId, onComplete }) {
    const countdownElement = document.getElementById(elementId);
    if (!countdownElement) {
      showGlobalError(`Countdown element "${elementId}" not found`);
      return;
    }

    let countdown = duration;
    countdownElement.textContent = countdown;
    updateAriaLive(elementId, countdown);

    const timer = setInterval(() => {
      countdown--;
      countdownElement.textContent = countdown;
      updateAriaLive(elementId, countdown);

      if (countdown <= 0) {
        this.cleanup(modalId);
        this.hide(modalId);
        if (typeof onComplete === "function") {
          try {
            onComplete();
          } catch (error) {
            showGlobalError(`Error in onComplete callback: ${error.message}`);
          }
        }
      }
    }, 1000);

    this.activeTimers.set(modalId, timer);
  }

  cleanup(modalId) {
    const timer = this.activeTimers.get(modalId);
    if (timer) {
      clearInterval(timer);
      this.activeTimers.delete(modalId);
    }
  }
}

const modalManager = new ModalManager();

document.addEventListener("DOMContentLoaded", () => {
  // Initialize AOS animations (run once for performance)
  if (typeof AOS !== "undefined") {
    AOS.init({ duration: 800, once: true });
  }

  // Form and modal DOM elements
  const form = document.getElementById("subscription-form");
  const formMessage = document.getElementById("form-message");
  const referralCodeInput = document.getElementById("referral-code");
  const fullNameInput = document.getElementById("full-name");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  const phonePrefixSpan = document.getElementById("phone-prefix");
  const dobInput = document.getElementById("dob");
  const genderSelect = document.getElementById("gender");
  const branchSelect = document.getElementById("branch");
  const groupSelect = document.getElementById("group");
  const artistSelect = document.getElementById("artist");
  const paymentTypeSelect = document.getElementById("payment-type");
  const installmentOptions = document.getElementById("installment-options");
  const paymentMethods = document.getElementById("payment-methods");
  const digitalCurrencyHomeBtn = document.getElementById("digital-currency-home-btn");
  const privacyPolicy = document.getElementById("privacy-policy");
  const subscriptionAgreement = document.getElementById("subscription-agreement");
  const permitIdInput = document.getElementById("permit-id");
  const submissionIdInput = document.getElementById("submission-id");
  const submitBtn = document.getElementById("submit-btn");
  const btnText = submitBtn ? submitBtn.querySelector(".btn-text") : null;
  const spinner = submitBtn ? submitBtn.querySelector(".spinner-border") : null;
  const progressBar = document.querySelector(".progress-bar");
  const countrySelect = document.getElementById("country-select");
  const countryInput = document.getElementById("country");
  const currencyInput = document.getElementById("currency");
  const languageInput = document.getElementById("language");
  const progressLive = document.createElement('div');
  let iti;
  let failure;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Show onboarding modal immediately
  modalManager.show("onboardingModal");

  // ========== GEO CACHING MECHANISM ==========
  const geoCache = {
    get: () => {
      const cached = localStorage.getItem('geoData');
      return cached ? JSON.parse(cached) : null;
    },
    set: (data) => {
      const cacheData = {
        data,
        expires: Date.now() + 3600000 // 1 hour
      };
      localStorage.setItem('geoData', JSON.stringify(cacheData));
    },
    isValid: (cached) => cached && cached.expires > Date.now()
  };

  // ========== HYBE BRANCH AND GROUP DATA ==========
  const branches = [
    { name: "BigHit Music", groups: ["BTS", "TXT"] },
    { name: "PLEDIS Entertainment", groups: ["SEVENTEEN", "fromis_9"] },
    { name: "BELIFT LAB", groups: ["ENHYPEN", "ILLIT"] },
    { name: "KOZ Entertainment", groups: ["ZICO"] },
    { name: "ADOR", groups: ["NewJeans"] },
    { name: "HYBE Labels Japan", groups: ["&TEAM"] },
  ];

  // Populate branch dropdown
  branches.forEach((branch) => {
    const option = document.createElement("option");
    option.value = branch.name;
    option.textContent = branch.name;
    branchSelect.appendChild(option);
  });

  // Update group and artist dropdowns based on selection
  branchSelect.addEventListener("change", () => {
    const selectedBranch = branches.find((branch) => branch.name === branchSelect.value);
    groupSelect.innerHTML = '<option value="" disabled selected>Select a Group</option>';
    artistSelect.innerHTML = '<option value="" disabled selected>Select an Artist</option>';
    if (selectedBranch) {
      selectedBranch.groups.forEach((group) => {
        const option = document.createElement("option");
        option.value = group;
        option.textContent = group;
        groupSelect.appendChild(option);
      });
    }
    updateProgress();
    auditLog('Branch selected', branchSelect.value);
    auditLog('Groups populated', Array.from(groupSelect.options).map(o => o.value));
  });

  groupSelect.addEventListener("change", () => {
    artistSelect.innerHTML = '<option value="" disabled selected>Select an Artist</option>';
    const selectedGroup = groupSelect.value;
    const artists = {
      BTS: ["RM", "Jin", "SUGA", "j-hope", "Jimin", "V", "Jung Kook"],
      TXT: ["SOOBIN", "YEONJUN", "BEOMGYU", "TAEHYUN", "HUENINGKAI"],
      SEVENTEEN: ["S.COUPS", "JEONGHAN", "JOSHUA", "JUN", "HOSHI", "WONWOO", "WOOZI", "THE 8", "MINGYU", "DK", "SEUNGKWAN", "VERNON", "DINO"],
      fromis_9: ["LEE SAEROM", "SONG HAYOUNG", "PARK JIWON", "ROH JISUN", "LEE SEOYEON", "LEE CHAEYOUNG", "LEE NAGYUNG", "BAEK JIHEON"],
      ENHYPEN: ["JUNGWON", "HEESEUNG", "JAY", "JAKE", "SUNGHOON", "SUNOO", "NI-KI"],
      ILLIT: ["YUNAH", "MINJU", "MOKA", "WONHEE", "IROHA"],
      ZICO: ["ZICO"],
      NewJeans: ["MINJI", "HANNI", "DANIELLE", "HAERIN", "HYEIN"],
      "&TEAM": ["K", "FUMA", "NICHOLAS", "EJ", "YUMA", "JO", "HARUA", "TAKI", "MAKI"],
    };
    if (artists[selectedGroup]) {
      artists[selectedGroup].forEach((artist) => {
        const option = document.createElement("option");
        option.value = artist;
        option.textContent = artist;
        artistSelect.appendChild(option);
      });
    }
    updateProgress();
  });

  // ========== WEIGHTED PROGRESS BAR ==========
  const fieldWeights = {
    'email': 1.2,
    'phone': 1.2,
    'branch': 1.1,
    'group': 1.1,
    'artist': 1.1,
    'payment-type': 1.1
  };

  function updateProgress() {
    let totalWeight = 0;
    let filledWeight = 0;
    
    const fields = [
      referralCodeInput, fullNameInput, emailInput, phoneInput,
      document.getElementById("address-line1"), document.getElementById("city"),
      document.getElementById("state"), document.getElementById("postal-code"),
      countrySelect, dobInput, genderSelect, branchSelect,
      groupSelect, artistSelect, paymentTypeSelect
    ];

    fields.forEach(field => {
      if (!field) return;
      const weight = fieldWeights[field.id] || 1;
      totalWeight += weight;
      
      if (field.value && field.checkValidity()) {
        filledWeight += weight;
      }
    });

    totalWeight += 1;
    if (document.querySelector('input[name="contact-method"]:checked')) {
      filledWeight += 1;
    }
    
    const progress = Math.min(100, (filledWeight / totalWeight) * 100);
    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute("aria-valuenow", progress);
    
    if (progressLive) {
      progressLive.textContent = `Form is ${Math.round(progress)}% complete`;
    }
  }

  // ========== ACCESSIBILITY ENHANCEMENTS ==========
  function enhanceAccessibility() {
    progressLive.id = 'progress-live';
    progressLive.setAttribute('aria-live', 'polite');
    progressLive.setAttribute('aria-atomic', 'true');
    progressLive.classList.add('sr-only');
    progressBar.parentElement.appendChild(progressLive);

    document.querySelectorAll('.invalid-feedback').forEach(el => {
      el.setAttribute('role', 'alert');
      el.setAttribute('aria-live', 'assertive');
    });

    document.querySelectorAll('input, select').forEach(el => {
      if (!el.id) return;
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label) {
        el.setAttribute('aria-labelledby', label.id);
      }
    });
  }

  // Initialize accessibility
  enhanceAccessibility();

  // ========== ENHANCED PHONE VALIDATION ==========
  const countryPhoneData = {
    US: { flag: "🇺🇸", code: "+1", format: "(XXX) XXX-XXXX" },
    GB: { flag: "🇬🇧", code: "+44", format: "XXXX XXXXXX" },
    JP: { flag: "🇯🇵", code: "+81", format: "XX-XXXX-XXXX" },
    KR: { flag: "🇰🇷", code: "+82", format: "XX-XXXX-XXXX" },
    CN: { flag: "🇨🇳", code: "+86", format: "XXX XXXX XXXX" },
    FR: { flag: "🇫🇷", code: "+33", format: "X XX XX XX XX" },
    DE: { flag: "🇩🇪", code: "+49", format: "XXXX XXXXXXX" },
    IN: { flag: "🇮🇳", code: "+91", format: "XXXXX-XXXXX" },
    BR: { flag: "🇧🇷", code: "+55", format: "(XX) XXXXX-XXXX" },
    CA: { flag: "🇨🇦", code: "+1", format: "(XXX) XXX-XXXX" },
    NG: { flag: "🇳🇬", code: "+234", format: "XXX XXX XXXX" }
  };

  async function initializePhoneField() {
    try {
      const { AsYouType } = await import('https://cdn.jsdelivr.net/npm/libphonenumber-js@1.10.11/+esm');

      let countryCode = 'NG';
      const cachedGeo = geoCache.get();
      if (cachedGeo && geoCache.isValid(cachedGeo)) {
        countryCode = cachedGeo.data.country_code;
      } else {
        const res = await safeFetch('https://ipwho.is/');
        const data = await res.json();
        countryCode = data.country_code || 'NG';
        geoCache.set(data);
      }

      const phoneData = countryPhoneData[countryCode] || countryPhoneData.NG;
      phonePrefixSpan.textContent = `${phoneData.flag} ${phoneData.code}`;

      phoneInput.addEventListener('input', (e) => {
        const formatter = new AsYouType(countryCode);
        phoneInput.value = formatter.input(e.target.value);
        validateField(phoneInput);
      });
    } catch (error) {
      console.error('Phone validation load failed:', error);
      phoneInput.addEventListener('input', () => validateField(phoneInput));
    }
  }

  initializePhoneField();

  // ========== DYNAMIC COUNTRY AND ADDRESS FIELDS ==========
  async function populateCountryDropdown() {
    countrySelect.innerHTML = '<option value="" disabled selected>Select Country</option>';
    let countries = [];
    let loaded = false;

    try {
      const res = await safeFetch('https://secure.geonames.org/countryInfoJSON?username=demo');
      if (res.ok) {
        const data = await res.json();
        if (data.geonames && Array.isArray(data.geonames)) {
          countries = data.geonames.map(c => ({ code: c.countryCode, name: c.countryName }));
          loaded = true;
        }
      }
    } catch (e) { showGlobalError('Could not load country list.'); }

    if (!loaded) {
      try {
        const res = await safeFetch('https://restcountries.com/v2/all?fields=name,alpha2Code');
        if (res.ok) {
          const data = await res.json();
          countries = data.map(c => ({ code: c.alpha2Code, name: c.name }));
          loaded = true;
        }
      } catch (e) { showGlobalError('Could not load country list.'); }
    }

    if (!loaded) {
      countries = [
        { code: 'US', name: 'United States' },
        { code: 'GB', name: 'United Kingdom' },
        { code: 'JP', name: 'Japan' },
        { code: 'KR', name: 'South Korea' },
        { code: 'CN', name: 'China' },
        { code: 'FR', name: 'France' },
        { code: 'DE', name: 'Germany' },
        { code: 'IN', name: 'India' },
        { code: 'BR', name: 'Brazil' },
        { code: 'CA', name: 'Canada' }
      ];
      setTimeout(() => {
        if (!countrySelect.value) {
          showToast('Could not auto-detect your country. Please select it manually from the list.', 'warning');
        }
      }, 500);
    }

    countries.sort((a, b) => a.name.localeCompare(b.name));
    countries.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = c.name;
      countrySelect.appendChild(opt);
    });
    const defaultOpt = countrySelect.querySelector('option[value=""]');
    if (defaultOpt) defaultOpt.removeAttribute('selected');
    countrySelect.style.display = "";

    let attempts = 0;
    let countrySet = false;
    while (attempts < 2 && !countrySet) {
      try {
        const res = await safeFetch("https://ipwho.is/");
        if (res.ok) {
          const data = await res.json();
          const cc = data.country_code ? data.country_code.toUpperCase() : '';
          if (countrySelect && cc) {
            const opt = Array.from(countrySelect.options).find(o => o.value.toUpperCase() === cc);
            if (opt) {
              countrySelect.value = opt.value;
              countryInput.value = opt.value;
              updateAddressFieldsForCountry(opt.value);
              countrySet = true;
            }
          }
        }
      } catch (e) {}
      attempts++;
    }
    setTimeout(() => {
      if (!countrySelect.value) {
        showToast('Could not auto-detect your country. Please select it manually from the list.', 'warning');
      }
    }, 500);
  }

  (async function autofillAddressFromIP() {
    try {
      const res = await safeFetch("https://ipwho.is/");
      if (res.ok) {
        const data = await res.json();
        if (data.city && document.getElementById("city")) document.getElementById("city").value = data.city;
        if (data.region && document.getElementById("state")) document.getElementById("state").value = data.region;
        if (data.postal && document.getElementById("postal-code")) document.getElementById("postal-code").value = data.postal;
      }
    } catch (e) { showGlobalError('Could not auto-fill your address.'); }
  })();

  async function dynamicAddressFields() {
    let detectedCountry = null;
    try {
      const res = await safeFetch("https://ipwho.is/");
      if (res.ok) {
        const data = await res.json();
        detectedCountry = data.country_code ? data.country_code.toUpperCase() : null;
      }
    } catch (e) { showGlobalError('Could not detect your country for address fields.'); }
    if (!detectedCountry && countrySelect && countrySelect.value) {
      detectedCountry = countrySelect.value.toUpperCase();
    }

    const addressFormats = {
      US: {
        fields: [
          { id: "address-line1", label: "Street Address", placeholder: "123 Main St", required: true },
          { id: "address-line2", label: "Apt/Suite (optional)", placeholder: "Apt, suite, etc.", required: false },
          { id: "city", label: "City", placeholder: "City", required: true },
          { id: "state", label: "State", placeholder: "State", required: true },
          { id: "postal-code", label: "ZIP Code", placeholder: "12345", required: true, pattern: /^\d{5}(-\d{4})?$/i, error: "Invalid ZIP code" }
        ],
        order: ["address-line1","address-line2","city","state","postal-code"]
      },
      GB: {
        fields: [
          { id: "address-line1", label: "Street Address", placeholder: "221B Baker St", required: true },
          { id: "address-line2", label: "Apartment (optional)", placeholder: "Flat, suite, etc.", required: false },
          { id: "city", label: "Town/City", placeholder: "London", required: true },
          { id: "state", label: "County", placeholder: "County", required: false },
          { id: "postal-code", label: "Postcode", placeholder: "SW1A 1AA", required: true, pattern: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, error: "Invalid UK postcode" }
        ],
        order: ["address-line1","address-line2","city","state","postal-code"]
      },
      JP: {
        fields: [
          { id: "postal-code", label: "Postal Code", placeholder: "100-0001", required: true, pattern: /^\d{3}-\d{4}$/, error: "Invalid postal code" },
          { id: "address-line1", label: "Prefecture", placeholder: "Tokyo", required: true },
          { id: "address-line2", label: "City/Ward", placeholder: "Chiyoda-ku", required: true },
          { id: "city", label: "Town/Block", placeholder: "Kanda", required: true },
          { id: "state", label: "Building/Apartment (optional)", placeholder: "Building, room, etc.", required: false }
        ],
        order: ["postal-code","address-line1","address-line2","city","state"]
      }
    };
    const genericFormat = {
      fields: [
        { id: "address-line1", label: "Address Line 1", placeholder: "Address Line 1", required: true },
        { id: "address-line2", label: "Address Line 2 (optional)", placeholder: "Address Line 2", required: false },
        { id: "city", label: "City/Town", placeholder: "City/Town", required: true },
        { id: "state", label: "State/Province/Region", placeholder: "State/Province/Region", required: false },
        { id: "postal-code", label: "Postal Code", placeholder: "Postal Code", required: true, pattern: /^.{2,10}$/, error: "Invalid postal code" }
      ],
      order: ["address-line1","address-line2","city","state","postal-code"]
    };
    const format = addressFormats[detectedCountry] || genericFormat;

    format.fields.forEach(f => {
      const el = document.getElementById(f.id);
      if (el) {
        el.placeholder = f.placeholder;
        el.previousElementSibling && (el.previousElementSibling.textContent = f.label);
        el.required = !!f.required;
        el.pattern = f.pattern ? f.pattern.source : "";
        el.setAttribute("data-error", f.error || "");
        el.parentElement && (el.parentElement.style.display = "");
      }
    });

    ["address-line1","address-line2","city","state","postal-code"].forEach(id => {
      if (!format.order.includes(id)) {
        const el = document.getElementById(id);
        if (el && el.parentElement) el.parentElement.style.display = "none";
      }
    });

    const addressFields = document.getElementById("address-fields");
    if (addressFields) {
      format.order.forEach(id => {
        const el = document.getElementById(id);
        if (el) addressFields.appendChild(el);
      });
    }
  }

  function updateAddressFieldsForCountry(countryCode) {
    const addressFields = ["address-line1", "address-line2", "city", "state", "postal-code", "country-select"];
    const isUS = countryCode === "US";
    const isCA = countryCode === "CA";
    const isGB = countryCode === "GB";
    const isJP = countryCode === "JP";
    const isKR = countryCode === "KR";
    const isCN = countryCode === "CN";
    const isNG = countryCode === "NG";

    document.getElementById("address-line2").closest(".form-group").classList.toggle("d-none", isUS || isCA);
    document.getElementById("state").closest(".form-group").classList.toggle("d-none", !isUS && !isCA && !isGB && !isNG);
    document.getElementById("postal-code").closest(".form-group").classList.toggle("d-none", false); // Always visible
    document.getElementById("country-select").closest(".form-group").classList.toggle("d-none", isUS || isCA);

    addressFields.forEach((field) => {
      const element = document.getElementById(field);
      if (element) {
        element.required = !element.closest(".form-group").classList.contains("d-none");
      }
    });

    if (isUS) document.getElementById("state").setAttribute("placeholder", "State (e.g., CA)");
    else if (isCA) document.getElementById("state").setAttribute("placeholder", "Province (e.g., ON)");
    else if (isGB) document.getElementById("state").setAttribute("placeholder", "County (e.g., Greater London)");
    else if (isJP) document.getElementById("state").setAttribute("placeholder", "都道府県 (e.g., 東京都)");
    else if (isKR) document.getElementById("state").setAttribute("placeholder", "시/도 (e.g., 서울특별시)");
    else if (isCN) document.getElementById("state").setAttribute("placeholder", "省/直辖市 (e.g., 北京市)");
    else if (isNG) document.getElementById("state").setAttribute("placeholder", "State (e.g., Lagos)");
    else document.getElementById("state").removeAttribute("placeholder");
  }

  // Initial population and dynamic updates
  populateCountryDropdown();
  if (countrySelect) {
    countrySelect.addEventListener("change", () => {
      updateAddressFieldsForCountry(countrySelect.value);
      dynamicAddressFields();
    });
  }
  dynamicAddressFields();

  // ========== FORM SUBMISSION AND PAYMENT LOGIC ==========
  const paymentModal = document.getElementById('paymentModal');
  const paymentCountdown = document.getElementById('payment-countdown');
  let paymentTimer = null;

  function showPaymentModalAndRedirect(amountType) {
    let seconds = 5;
    if (paymentCountdown) paymentCountdown.textContent = seconds;
    const modal = new bootstrap.Modal(paymentModal);
    modal.show();
    paymentTimer = setInterval(() => {
      seconds--;
      if (paymentCountdown) paymentCountdown.textContent = seconds;
      if (seconds <= 0) {
        clearInterval(paymentTimer);
        modal.hide();
        let stripeUrl = amountType === 'installment' ? 'https://checkout.stripe.com/pay/cs_test_installment' : 'https://checkout.stripe.com/pay/cs_test_full';
        window.location.href = stripeUrl;
      }
    }, 1000);
  }

  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const analyticsData = {
        timestamp: new Date().toISOString(),
        fieldsFilled: 0,
        validationErrors: 0,
        startTime: performance.now()
      };

      form.querySelectorAll('input, select, textarea').forEach(field => {
        if (field.value) analyticsData.fieldsFilled++;
        if (!field.checkValidity()) analyticsData.validationErrors++;
      });

      let valid = true;
      form.querySelectorAll('input, select, textarea').forEach(field => {
        if (!validateField(field)) valid = false;
      });
      if (!valid) {
        e.preventDefault();
        showModernError('Please correct the highlighted errors and try again.');
        return;
      }

      const cardPayment = document.getElementById('card-payment');
      if (cardPayment && cardPayment.checked && form.checkValidity()) {
        e.preventDefault();
        const paymentType = paymentTypeSelect ? paymentTypeSelect.value : 'Full Payment';
        showPaymentModalAndRedirect(paymentType === 'Installment' ? 'installment' : 'full');
      } else {
        submitBtn.disabled = true;
        spinner.classList.remove('d-none');
        btnText.textContent = 'Submitting...';

        try {
          const formData = new FormData(form);
          await fetch('/.netlify/functions/submit-form', { method: 'POST', body: formData });
          analyticsData.duration = performance.now() - analyticsData.startTime;
          navigator.sendBeacon('/analytics', JSON.stringify({ type: 'form_submission', data: analyticsData }));
          showToast('Subscription submitted! Redirecting...', 'success', 3000);
          setTimeout(() => {
            let redirectUrl = 'success.html';
            const paymentMethod = document.querySelector('input[name="payment-method"]:checked');
            if (paymentMethod && paymentMethod.value === 'Card') redirectUrl = 'stripe-success.html';
            showEnhancedLoadingRedirectModal(redirectUrl);
          }, 2000);
        } catch (err) {
          let retry = confirm('Submission failed. Would you like to retry?\n' + (err.message || ''));
          if (retry) {
            submitBtn.disabled = false;
            spinner.classList.add('d-none');
            btnText.textContent = 'Submit Subscription';
            return;
          } else {
            showModernError('Submission failed. Please try again later.', err.message);
          }
        }
        submitBtn.disabled = false;
        spinner.classList.add('d-none');
        btnText.textContent = 'Submit Subscription';
      }
    });
  }

  // ========== VALIDATION AND UI HELPERS ==========
  const validationRules = {
    'referral-code': { required: true, message: 'Referral code is required.' },
    'full-name': { required: true, message: 'Please enter your full name.' },
    'email': { required: true, pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, message: 'Please enter a valid email address.' },
    'phone': { required: true, pattern: /^\+?[\d\s\-()]{7,20}$/, message: 'Please enter a valid phone number.' },
    'address-line1': { required: true, message: 'Street address is required.' },
    'city': { required: true, message: 'City is required.' },
    'state': { required: true, message: 'State/Region is required.' },
    'postal-code': { required: true, message: 'Postal code is required.' },
    'country-select': { required: true, message: 'Please select your country.' },
    'dob': { required: true, message: 'Date of birth is required.' },
    'gender': { required: true, message: 'Please select your gender.' },
    'branch': { required: true, message: 'Please select a branch.' },
    'group': { required: true, message: 'Please select a group.' },
    'artist': { required: true, message: 'Please select an artist.' },
    'payment-type': { required: true, message: 'Please select a payment type.' },
    'contact-method': { required: true, message: 'Please select a contact method.' },
    'subscription-agreement': { required: true, message: 'You must agree to complete your subscription.' }
  };

  function showFieldError(field, message) {
    let feedback = field.parentElement.querySelector('.invalid-feedback');
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.className = 'invalid-feedback';
      field.parentElement.appendChild(feedback);
    }
    feedback.textContent = message;
    field.classList.add('is-invalid');
    field.setAttribute('aria-invalid', 'true');
  }

  function clearFieldError(field) {
    let feedback = field.parentElement.querySelector('.invalid-feedback');
    if (feedback) feedback.textContent = '';
    field.classList.remove('is-invalid');
    field.setAttribute('aria-invalid', 'false');
  }

  function validateField(field) {
    const rule = validationRules[field.name || field.id];
    if (!rule) return true;
    if (rule.required && !field.value) {
      showFieldError(field, rule.message);
      return false;
    }
    if (rule.pattern && field.value && !rule.pattern.test(field.value)) {
      showFieldError(field, rule.message);
      return false;
    }
    clearFieldError(field);
    return true;
  }

  if (form) {
    form.querySelectorAll('input, select, textarea').forEach(field => {
      field.addEventListener('input', () => validateField(field));
      field.addEventListener('blur', () => validateField(field));
      field.addEventListener('invalid', (e) => {
        e.preventDefault();
        shakeField(field);
      });
    });
  }

  function shakeField(field) {
    if (!field) return;
    field.classList.remove('shake');
    void field.offsetWidth;
    field.classList.add('shake');
    field.addEventListener('animationend', function handler() {
      field.classList.remove('shake');
      field.removeEventListener('animationend', handler);
    });
  }

  function isFormValidRealtime(debug = false) {
    const requiredFields = [
      fullNameInput, emailInput, phoneInput, dobInput, genderSelect,
      branchSelect, groupSelect, artistSelect, paymentTypeSelect,
      document.getElementById("address-line1"), document.getElementById("city"),
      document.getElementById("state"), document.getElementById("postal-code"),
      countrySelect
    ];
    let debugList = [];
    for (const field of requiredFields) {
      if (!field) continue;
      if (field.required !== false && (field.value === undefined || field.value === null || field.value === "")) {
        if (debug) debugList.push(field.name || field.id || field);
        else return false;
      }
      if (typeof field.checkValidity === "function" && !field.checkValidity()) {
        if (debug) debugList.push(field.name || field.id || field);
        else return false;
      }
    }
    if (!document.querySelector('input[name="contact-method"]:checked')) {
      if (debug) debugList.push("contact-method");
      else return false;
    }
    const paymentMethodInputs = document.querySelectorAll('input[name="payment-method"]');
    let paymentMethodRequired = false;
    paymentMethodInputs.forEach(input => {
      if (!input.closest('.d-none')) paymentMethodRequired = true;
    });
    if (paymentMethodRequired && !document.querySelector('input[name="payment-method"]:checked')) {
      if (debug) debugList.push("payment-method");
      else return false;
    }
    if (paymentTypeSelect && paymentTypeSelect.value === "Installment") {
      const installmentPlan = document.getElementById("installment-plan");
      if (installmentPlan && (!installmentPlan.value || !installmentPlan.checkValidity())) {
        if (debug) debugList.push("installment-plan");
        else return false;
      }
    }
    if (debug) return debugList;
    return true;
  }

  function updateSubmitButtonState() {
    if (!submitBtn) return;
    const valid = isFormValidRealtime();
    submitBtn.disabled = !valid;
    if (!valid && debugMsg) {
      const missing = isFormValidRealtime(true);
      debugMsg.textContent = missing.length > 0 ? `Cannot submit: missing/invalid → ${missing.join(", ")}` : '';
    } else if (debugMsg) {
      debugMsg.textContent = '';
    }
  }

  const debugMsg = document.createElement('div');
  debugMsg.id = 'form-debug-msg';
  debugMsg.style.color = 'red';
  debugMsg.style.fontSize = '0.95em';
  debugMsg.style.marginTop = '0.5em';
  if (submitBtn) submitBtn.parentNode.insertBefore(debugMsg, submitBtn.nextSibling);

  const installmentTerms = document.getElementById("installment-terms");
  if (installmentTerms) {
    installmentTerms.closest('.form-check').classList.add('d-none');
    installmentTerms.required = false;
  }

  function updateInstallmentTermsVisibility() {
    if (!installmentTerms) return;
    if (paymentTypeSelect && paymentTypeSelect.value === "Installment") {
      installmentTerms.closest('.form-check').classList.remove('d-none');
      installmentTerms.required = true;
    } else {
      installmentTerms.closest('.form-check').classList.add('d-none');
      installmentTerms.checked = false;
      installmentTerms.required = false;
    }
  }

  if (paymentTypeSelect) {
    paymentTypeSelect.addEventListener('change', () => {
      updateInstallmentTermsVisibility();
      if (paymentTypeSelect.value === "Installment") {
        showElement(installmentOptions);
        document.getElementById("installment-plan").required = true;
      } else {
        hideElement(installmentOptions);
        document.getElementById("installment-plan").required = false;
      }
      document.querySelectorAll('input[name="payment-method"]').forEach((input) => {
        input.required = true;
      });
      updateProgress();
      auditLog('Payment type changed', paymentTypeSelect.value);
      auditLog('Installment options visible', !installmentOptions.classList.contains('d-none'));
    });
    updateInstallmentTermsVisibility();
  }

  // Add input event listeners for progress and validation
  const inputs = [
    "referral-code", "full-name", "email", "phone", "address-line1",
    "address-line2", "city", "state", "postal-code", "country-select",
    "dob", "gender", "branch", "group", "artist", "payment-type"
  ];
  inputs.forEach((id) => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener("input", () => {
        updateProgress();
        validateField(input);
        updateSubmitButtonState();
        auditLog('Field changed', { id: sanitizeInput(input.id), value: sanitizeInput(input.value) });
      });
    }
  });

  document.querySelectorAll('input[name="contact-method"]').forEach((input) => {
    input.addEventListener("change", () => {
      updateProgress();
      updateSubmitButtonState();
    });
  });

  // Initialize tooltips for accessibility
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((tooltipTriggerEl) => {
    new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // FormData polyfill
  if (typeof FormData === 'undefined') {
    window.FormData = function(form) {
      const data = {};
      Array.from(form.elements).forEach(el => {
        if (el.name && !el.disabled) data[el.name] = el.value;
      });
      return { forEach: (cb) => Object.entries(data).forEach(([k, v]) => cb(v, k)) };
    };
  }
});

// === UTILITY FUNCTIONS ===
async function detectGeoIP() {
  const endpoints = [
    { url: "https://ipwho.is/", cc: "country_code", name: "country" },
    { url: "https://ipapi.co/json/", cc: "country_code", name: "country_name" },
    { url: "https://freeipapi.com/api/json", cc: "countryCode", name: "countryName" }
  ];
  for (const ep of endpoints) {
    try {
      const res = await safeFetch(ep.url);
      const data = await res.json();
      const cc = data[ep.cc]?.toUpperCase();
      const name = data[ep.name];
      if (cc) return { cc, name };
    } catch (_) {}
  }
  return { cc: "", name: "" };
}

function setIfExists(id, value) {
  const el = document.getElementById(id);
  if (el && value) el.value = value;
}

function attachChangeLogger(inputs) {
  inputs.forEach(input => {
    if (input) {
      input.addEventListener('change', () =>
        auditLog('Field changed', { id: sanitizeInput(input.id), value: sanitizeInput(input.value) })
      );
    }
  });
}

function sanitizeInput(value) {
  const temp = document.createElement('div');
  temp.textContent = value;
  return temp.innerHTML;
}

function showMessage(message, type = "info") {
  if (formMessage) {
    formMessage.className = `mt-3 text-center alert alert-${type} alert-dismissible fade show`;
    formMessage.textContent = message;
    formMessage.classList.remove("d-none");
    setTimeout(() => {
      formMessage.classList.add("d-none");
    }, 7000);
  }
}

function resetButton() {
  if (submitBtn && spinner && btnText) {
    submitBtn.disabled = false;
    spinner.classList.add("d-none");
    btnText.classList.remove("d-none");
  }
}

function generatePermitId() {
  const timestamp = Date.now().toString(36);
  const randomNum = Math.random().toString(36).substring(2, 8);
  return `PERMIT-${timestamp}-${randomNum}`;
}

function showToast(message, type = 'warning', timeout = 4000) {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.style.position = 'fixed';
    toast.style.bottom = '32px';
    toast.style.right = '32px';
    toast.style.zIndex = '9999';
    toast.style.minWidth = '240px';
    toast.style.maxWidth = '360px';
    toast.style.background = type === 'warning' ? '#fff3cd' : '#f8d7da';
    toast.style.color = '#856404';
    toast.style.border = '1px solid #ffeeba';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    toast.style.padding = '16px 20px';
    toast.style.fontSize = '1rem';
    toast.style.display = 'none';
    toast.style.transition = 'opacity 0.3s';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span style='font-weight:bold;'>${type === 'warning' ? '⚠️' : '❌'} </span>${message}`;
  toast.style.display = 'block';
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { toast.style.display = 'none'; }, 350);
  }, timeout);
}

function showModernError(message, details) {
  showToast(message + (details ? ' - ' + details : ''), 'danger');
}

function showGlobalError(message, details) {
  showModernError(message, details);
}

function showEnhancedLoadingRedirectModal(redirectUrl, message = 'Redirecting, please wait...') {
  const modal = document.getElementById('loadingRedirectModal');
  const countdownEl = document.getElementById('redirect-countdown');
  const label = document.getElementById('loadingRedirectLabel');
  let seconds = 5;
  if (countdownEl) countdownEl.textContent = seconds;
  if (label) label.textContent = message;
  if (modal) {
    const bsModal = new bootstrap.Modal(modal, { backdrop: 'static', keyboard: false });
    bsModal.show();
    const timer = setInterval(() => {
      seconds--;
      if (countdownEl) countdownEl.textContent = seconds;
      if (seconds <= 0) {
        clearInterval(timer);
        bsModal.hide();
        window.location.href = redirectUrl;
      }
    }, 1000);
  } else {
    setTimeout(() => { window.location.href = redirectUrl; }, 5000);
  }
}

function showSpinnerTimeout(modalId, timeout = 15000) {
  setTimeout(() => {
    const modal = document.getElementById(modalId);
    if (modal && modal.classList.contains('show')) {
      showGlobalError('This is taking longer than expected. Please check your connection or try again.');
      const bsModal = bootstrap.Modal.getInstance(modal);
      if (bsModal) bsModal.hide();
    }
  }, timeout);
}

function updateAriaLive(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
    el.setAttribute('aria-live', 'assertive');
  }
}

async function safeFetch(url, options) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error('Network error: ' + res.status);
    return res;
  } catch (e) {
    showGlobalError('Network error: ' + (e.message || e));
    throw e;
  }
}

function showElement(el) {
  if (el) {
    el.classList.remove("d-none");
    if (el.style) el.style.display = "";
  }
}

function hideElement(el) {
  if (el) {
    el.classList.add("d-none");
    if (el.style) el.style.display = "none";
  }
}

function auditLog(msg, data) {
  if (window.location.hostname === 'localhost' || window.DEBUG_FORM_AUDIT) {
    console.log('[FORM AUDIT]', msg, data || '');
  }
}

// === CSS FOR MODAL TRANSITIONS AND ACCESSIBILITY ===
const style = document.createElement('style');
style.textContent = `
  .modal-transition-in {
    opacity: 0;
    transform: translateY(-20px);
    transition: opacity 0.3s ease, transform 0.3s ease;
  }
  
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  
  .shake {
    animation: shake 0.5s;
  }
  
  @keyframes shake {
    0% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    50% { transform: translateX(5px); }
    75% { transform: translateX(-5px); }
    100% { transform: translateX(0); }
  }
`;
document.head.appendChild(style);