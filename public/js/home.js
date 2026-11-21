const categoriesContainer = document.getElementById(
  "categories-container",
);

const loadCategories = async () => {
  if (!categoriesContainer) return;

  try {
    const response = await fetch("/api/categories", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Failed to fetch categories",
      );
    }

    const categories = result.data || [];

    categoriesContainer.innerHTML = "";

    if (!categories.length) {
      categoriesContainer.innerHTML = `
        <div class="category-empty">
          <i class="bi bi-calendar2-x"></i>
          <h3>No categories available</h3>
          <p>Check back later for exciting experiences.</p>
        </div>
      `;

      return;
    }

    categories.forEach((category, index) => {
      const card = document.createElement("a");

      card.className = "category-card";

      card.href = `/events?category=${encodeURIComponent(
        category._id,
      )}`;

      const iconWrapper = document.createElement("div");

      iconWrapper.className = "category-icon";

      const icon = document.createElement("i");

      const iconClass = String(category.icon || "bi-calendar-event")
        .split(" ")
        .filter((value) => /^[a-zA-Z0-9_-]+$/.test(value))
        .join(" ");

      icon.className = `bi ${iconClass}`;

      iconWrapper.appendChild(icon);

      const content = document.createElement("div");

      content.className = "category-content";

      const title = document.createElement("h3");

      title.textContent = category.name || "Untitled Category";

      const description = document.createElement("p");

      description.textContent =
        category.description || "Explore exciting experiences.";

      content.append(title, description);

      const arrow = document.createElement("span");

      arrow.className = "category-arrow";

      arrow.innerHTML = '<i class="bi bi-arrow-up-right"></i>';

      card.append(iconWrapper, content, arrow);

      card.style.setProperty("--card-index", index);

      categoriesContainer.appendChild(card);
    });

  } catch (error) {
    console.error("Home Page Error:", error);

    categoriesContainer.innerHTML = `
      <div class="category-error">
        <i class="bi bi-exclamation-circle"></i>
        <h3>Unable to load categories</h3>
        <p>Please refresh the page and try again.</p>

        <button class="category-retry-btn" id="retry-categories">
          Try Again
        </button>
      </div>
    `;

    document
      .getElementById("retry-categories")
      ?.addEventListener("click", loadCategories);
  }
};

loadCategories();