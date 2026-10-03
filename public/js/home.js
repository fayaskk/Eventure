const categories = document.getElementById("category-container");

const loadCategories = async () => {
  try {
    const response = await fetch("/api/categories", {
      method: "GET",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch categories");
    }

    result.data.forEach((element) => {
      const card = document.createElement("div");

      card.className = "category-card";

      card.innerHTML = `
        <div class="category-icon">
          <i class="bi ${element.icon}"></i>
        </div>

        <h3>${element.name}</h3>

        <p>${element.description}</p>
      `;

      categories.appendChild(card);
    });
  } catch (error) {
    console.error("Home Page Error:", error);

    categories.innerHTML = `
      <div class="category-error">
        Failed to load categories. Please try again later.
      </div>
    `;
  }
};

loadCategories();