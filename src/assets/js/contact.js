// Contact form behavior with htmx.
// On success: hide the form fields and show only the confirmation.
// On error: reset Turnstile, because each token can only be used once.
(function () {
  document.addEventListener("htmx:afterRequest", function (event) {
    var form = event.detail.elt;
    if (!form || form.id !== "contact-form") return;

    var result = document.getElementById("contact-result");

    if (event.detail.successful) {
      Array.prototype.forEach.call(form.children, function (child) {
        if (child !== result) child.hidden = true;
      });
      if (result) result.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (window.turnstile) {
      window.turnstile.reset(form.querySelector(".cf-turnstile"));
    }
  });
})();
