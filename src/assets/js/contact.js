// Contact form behavior with htmx 4.
// htmx 4 swaps 4xx/5xx responses by default, so server error messages appear in #contact-result.
// On success: hide the form fields and show only the confirmation.
// On failure: reset Turnstile, because each token can only be verified once.
(function () {
  function resetTurnstile(form) {
    if (window.turnstile) {
      window.turnstile.reset(form.querySelector(".cf-turnstile"));
    }
  }

  document.addEventListener("htmx:after:swap", function (event) {
    var form = event.target;
    if (!form || form.id !== "contact-form") return;

    var response = event.detail.ctx && event.detail.ctx.response;
    var result = document.getElementById("contact-result");

    if (response && response.status < 400) {
      Array.prototype.forEach.call(form.children, function (child) {
        if (child !== result) child.hidden = true;
      });
      if (result) result.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    resetTurnstile(form);
  });

  // The request never reached the server (offline, DNS failure, timeout).
  document.addEventListener("htmx:error", function (event) {
    var form = event.target;
    if (!form || form.id !== "contact-form") return;

    var result = document.getElementById("contact-result");
    if (result) {
      result.innerHTML = '<div class="form-error" role="alert">We could not reach our server. Please check your connection and try again, or email service@dakotahorizons.com.</div>';
    }
    resetTurnstile(form);
  });
})();
