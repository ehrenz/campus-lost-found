<template>
  <div class="app-container">
    <!-- Landing Page Section -->
    <main v-if="currentPage === 'home'" class="landing-page">
      <section class="landing-card">
        <h1 class="main-title" @click="toggleAdmin">LOST & FOUND</h1>

        <div class="landing-content">
          <div class="landing-actions">
            <button
              class="landing-link"
              @mouseenter="showNote('look')"
              @mouseleave="hideNote()"
              @focus="showNote('look')"
              @blur="hideNote()"
              @click="currentPage = 'board'"
            >
              Looking for Something?
            </button>

            <button
              class="landing-link"
              @mouseenter="showNote('found')"
              @mouseleave="hideNote()"
              @focus="showNote('found')"
              @blur="hideNote()"
              @click="currentPage = 'submit'"
            >
              Found Something?
            </button>

            <button
              v-if="adminLinkVisible"
              id="adminLink"
              class="admin-link show"
              @click="currentPage = 'admin'"
            >
              are you an admin?
            </button>
          </div>

          <aside id="sideNote" class="side-note" :class="{ show: noteVisible }">
            <strong>{{ noteTitle }}</strong>
            <div>{{ noteText }}</div>
          </aside>
        </div>
      </section>
    </main>

    <!-- Item Board Section -->
    <main v-if="currentPage === 'board'" class="page">
      <button class="back-button" @click="currentPage = 'home'">← Back to Home</button>
      
      <section id="items" class="section">
        <div class="section-title">
          <div>
            <p class="eyebrow">Item Board</p>
            <h2>Available Found Items</h2>
          </div>

          <div class="search-area">
            <input
              v-model="searchText"
              class="search"
              placeholder="Search keyword, item, building..."
            />

            <button class="filter-button" @click="showFilters = !showFilters">
              Filter
            </button>
          </div>
        </div>

        <div v-if="showFilters" class="filters">
          <select v-model="filterLocation">
            <option value="">All Buildings</option>
            <option
              v-for="location in locations"
              :key="location"
              :value="location"
            >
              {{ location }}
            </option>
          </select>

          <div class="date-filter">
            <label>
              From
              <input v-model="startDate" type="date" />
            </label>

            <label>
              To
              <input v-model="endDate" type="date" />
            </label>
          </div>

          <button class="clear-button" @click="clearFilters">
            Clear Filters
          </button>
        </div>

        <div v-if="filteredItems.length === 0" class="empty">
          No matching available items found.
        </div>

        <div class="grid">
          <article v-for="item in filteredItems" :key="item.id" class="card">
            <img
              v-if="item.image_path"
              :src="serverUrl + item.image_path"
              :alt="item.name"
              class="card-image"
              @click="expandedPhoto = serverUrl + item.image_path"
            />

            <div class="card-body">
              <span class="status available">Available</span>

              <h3>{{ item.name }}</h3>
              <p><strong>Building:</strong> {{ item.location }}</p>
              <p><strong>Date:</strong> {{ item.found_date }}</p>
              <p>{{ item.description }}</p>

              <div v-if="keywordList(item.keywords).length > 0" class="tag-row">
                <span
                  v-for="keyword in keywordList(item.keywords)"
                  :key="keyword"
                  class="tag"
                >
                  #{{ keyword }}
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>

    <!-- Found Something Section -->
    <main v-if="currentPage === 'submit'" class="page">
      <button class="back-button" @click="currentPage = 'home'">← Back to Home</button>

      <section id="submit" class="section">
        <p class="eyebrow">Submit</p>
        <h2>Found Something?</h2>

        <form class="form" @submit.prevent="submitItem">
          <input v-model="form.name" placeholder="Item name" required />

          <select v-model="form.location" required>
            <option value="" disabled>Which building did you find this in?</option>
            <option
              v-for="location in locations"
              :key="location"
              :value="location"
            >
              {{ location }}
            </option>
          </select>

          <input v-model="form.found_date" type="date" required />

          <textarea
            v-model="form.description"
            placeholder="Describe the item and where you found it. Example: Found near classroom 203."
          ></textarea>

          <input type="file" accept="image/*" @change="handleImage" />

          <button type="submit">Submit for Review</button>
        </form>

        <p v-if="message" class="message">{{ message }}</p>
      </section>
    </main>

    <!-- Admin Section -->
    <main v-if="currentPage === 'admin'" class="page">
      <button class="back-button" @click="currentPage = 'home'">← Back to Home</button>

      <section class="section admin">
        <p class="eyebrow">Admin</p>
        <h2>Admin Review Panel</h2>

        <div v-if="!adminUnlocked" class="admin-login">
          <input
            v-model="adminPassword"
            type="password"
            placeholder="Enter admin password"
          />
          <button @click="unlockAdmin">Enter</button>
        </div>

        <div v-else>
          <div class="admin-filters">
            <input
              v-model="adminSearchText"
              placeholder="Search admin items..."
            />

            <select v-model="adminStatusFilter">
              <option value="">All Status</option>
              <option value="pending">Pending Review</option>
              <option value="available">Available</option>
              <option value="returned">Returned</option>
            </select>
          </div>

          <div class="admin-list">
            <div
              v-for="item in filteredAdminItems"
              :key="item.id"
              class="admin-card"
            >
              <div>
                <strong>{{ item.name }}</strong>
                <p>{{ item.location }} · {{ item.found_date }}</p>
                <span class="status" :class="item.status">
                  {{ statusLabel(item.status) }}
                </span>
              </div>

              <div class="admin-actions">
                <button
                  v-if="item.status === 'pending'"
                  @click="approveItem(item.id)"
                >
                  Approve
                </button>

                <button
                  v-if="item.status === 'available'"
                  @click="markReturned(item.id)"
                >
                  Mark Returned
                </button>

                <button class="danger" @click="deleteItem(item.id)">
                  Delete
                </button>
              </div>

              <button class="edit-toggle" @click="toggleEdit(item.id)">
                {{ editingItemId === item.id ? "Close" : "Edit Details" }}
              </button>

              <div v-if="editingItemId === item.id" class="edit-panel">
                <h3>Edit Item Details</h3>

                <div class="edit-grid">
                  <input v-model="item.name" placeholder="Name" />

                  <select v-model="item.location">
                    <option
                      v-for="location in locations"
                      :key="location"
                      :value="location"
                    >
                      {{ location }}
                    </option>
                  </select>

                  <input v-model="item.found_date" type="date" />

                  <textarea
                    v-model="item.description"
                    class="edit-description"
                    placeholder="Improve the description here"
                  ></textarea>

                  <select v-model="item.status">
                    <option value="pending">Pending Review</option>
                    <option value="available">Available</option>
                    <option value="returned">Returned</option>
                  </select>
                </div>

                <div class="keyword-editor">
                  <label>Keywords</label>

                  <div class="tag-row">
                    <span
                      v-for="keyword in keywordList(item.keywords)"
                      :key="keyword"
                      class="tag removable"
                      @click="removeKeyword(item, keyword)"
                    >
                      #{{ keyword }} ×
                    </span>
                  </div>

                  <div class="keyword-input-row">
                    <input
                      v-model="item.newKeyword"
                      placeholder="Add one keyword, e.g. Bottle"
                      @keyup.enter.prevent="addKeyword(item)"
                    />

                    <button @click="addKeyword(item)">
                      Add Keyword
                    </button>
                  </div>
                </div>

                <button class="save-button" @click="updateItem(item)">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Photo Modal -->
    <div v-if="expandedPhoto" class="photo-modal" @click="expandedPhoto = null">
      <div class="photo-modal-content" @click.stop>
        <button class="photo-close-button" @click="expandedPhoto = null">×</button>
        <img :src="expandedPhoto" :alt="'Expanded photo'" />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      serverUrl: "",
      items: [],
      adminItems: [],

      searchText: "",
      showFilters: false,
      filterLocation: "",
      startDate: "",
      endDate: "",

      adminSearchText: "",
      adminStatusFilter: "",

      message: "",
      selectedImage: null,
      adminPassword: "",
      adminUnlocked: false,

      // Navigation & Landing Page State
      currentPage: "home",
      noteVisible: false,
      noteTitle: "",
      noteText: "",
      noteAction: "",
      adminLinkVisible: false,
      editingItemId: null,

      locations: [
        "Engineering Building",
        "Business Building",
        "Science Building",
        "Mathematics Building",
        "Language Building"
      ],

      form: {
        name: "",
        location: "",
        found_date: "",
        description: ""
      },
      expandedPhoto: null
    };
  },

  computed: {
    filteredItems() {
      const keyword = this.searchText.toLowerCase();

      return this.items.filter((item) => {
        const matchesKeyword =
          item.name.toLowerCase().includes(keyword) ||
          item.location.toLowerCase().includes(keyword) ||
          (item.description || "").toLowerCase().includes(keyword) ||
          (item.keywords || "").toLowerCase().includes(keyword);

        const matchesLocation =
          this.filterLocation === "" || item.location === this.filterLocation;

        const matchesStartDate =
          this.startDate === "" || item.found_date >= this.startDate;

        const matchesEndDate =
          this.endDate === "" || item.found_date <= this.endDate;

        return (
          matchesKeyword &&
          matchesLocation &&
          matchesStartDate &&
          matchesEndDate
        );
      });
    },

    filteredAdminItems() {
      const keyword = this.adminSearchText.toLowerCase();

      return this.adminItems.filter((item) => {
        const matchesKeyword =
          item.name.toLowerCase().includes(keyword) ||
          item.location.toLowerCase().includes(keyword) ||
          (item.description || "").toLowerCase().includes(keyword) ||
          (item.keywords || "").toLowerCase().includes(keyword);

        const matchesStatus =
          this.adminStatusFilter === "" ||
          item.status === this.adminStatusFilter;

        return matchesKeyword && matchesStatus;
      });
    }
  },

  methods: {
    async loadItems() {
      const response = await fetch("/api/items");
      this.items = await response.json();
    },

    // Landing Page Methods
    showNote(type) {
      if (type === "look") {
        this.noteTitle = "Browse available found items around campus.";
        this.noteText = "Search by item name, building, date, description, or keywords.";
        this.noteAction = "View Items";
      }

      if (type === "found") {
        this.noteTitle = "Place the item in a Lost & Found area and submit it.";
        this.noteText = "Your post will be reviewed before appearing publicly.";
        this.noteAction = "Submit Item";
      }

      this.noteVisible = true;
    },

    hideNote() {
      this.noteVisible = false;
    },

    toggleAdmin() {
      this.adminLinkVisible = !this.adminLinkVisible;
    },

    async loadAdminItems() {
      const response = await fetch("/api/admin/items");
      const data = await response.json();

      this.adminItems = data.map((item) => {
        return {
          ...item,
          newKeyword: ""
        };
      });
    },

    handleImage(event) {
      this.selectedImage = event.target.files[0];
    },

    // Landing Page Logic
    showNote(type) {
      this.noteVisible = true;
      if (type === "look") {
        this.noteTitle = "Find your stuff";
        this.noteText =
          "Browse through all the items found on campus. You can search by building or date.";
        this.noteAction = "Click to open the Board";
      } else if (type === "found") {
        this.noteTitle = "Report an item";
        this.noteText =
          "If you found something, please report it. We'll verify it and post it on the board.";
        this.noteAction = "Click to start the process";
      }
    },

    hideNote() {
      this.noteVisible = false;
    },

    toggleAdmin() {
      this.adminLinkVisible = !this.adminLinkVisible;
    },

    async submitItem() {
      const formData = new FormData();

      formData.append("name", this.form.name);
      formData.append("location", this.form.location);
      formData.append("found_date", this.form.found_date);
      formData.append("description", this.form.description);

      if (this.selectedImage) {
        formData.append("image", this.selectedImage);
      }

      await fetch("/api/items", {
        method: "POST",
        body: formData
      });

      this.message = "Your item was submitted and is waiting for admin review.";

      this.form = {
        name: "",
        location: "",
        found_date: "",
        description: ""
      };

      this.selectedImage = null;

      if (this.adminUnlocked) {
        this.loadAdminItems();
      }
    },

    unlockAdmin() {
      if (this.adminPassword === "admin123") {
        this.adminUnlocked = true;
        this.loadAdminItems();
      } else {
        alert("Wrong admin password");
      }
    },

    async approveItem(id) {
      await fetch(`/api/items/${id}/approve`, {
        method: "PUT"
      });

      this.loadItems();
      this.loadAdminItems();
    },

    async markReturned(id) {
      await fetch(`/api/items/${id}/returned`, {
        method: "PUT"
      });

      this.loadItems();
      this.loadAdminItems();
    },

    async deleteItem(id) {
      await fetch(`/api/items/${id}`, {
        method: "DELETE"
      });

      this.loadItems();
      this.loadAdminItems();
    },

    async updateItem(item) {
      const updatedItem = {
        name: item.name,
        location: item.location,
        found_date: item.found_date,
        description: item.description,
        keywords: item.keywords,
        status: item.status
      };

      await fetch(`/api/items/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updatedItem)
      });

      this.message = "Item updated successfully.";
      this.editingItemId = null;
      await this.loadAdminItems();
      await this.loadItems();
    },

    toggleEdit(itemId) {
      this.editingItemId = this.editingItemId === itemId ? null : itemId;
    },

    clearFilters() {
      this.searchText = "";
      this.filterLocation = "";
      this.startDate = "";
      this.endDate = "";
    },

    keywordList(keywords) {
      if (!keywords) {
        return [];
      }

      return keywords
        .split(" ")
        .map((keyword) => keyword.trim())
        .filter((keyword) => keyword !== "");
    },

    formatKeyword(keyword) {
      const cleaned = keyword.trim();

      if (cleaned === "") {
        return "";
      }

      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
    },

    addKeyword(item) {
      const newKeyword = this.formatKeyword(item.newKeyword || "");

      if (newKeyword === "") {
        return;
      }

      const currentKeywords = this.keywordList(item.keywords);

      if (!currentKeywords.includes(newKeyword)) {
        currentKeywords.push(newKeyword);
      }

      item.keywords = currentKeywords.join(" ");
      item.newKeyword = "";
    },

    removeKeyword(item, keywordToRemove) {
      const currentKeywords = this.keywordList(item.keywords);

      item.keywords = currentKeywords
        .filter((keyword) => keyword !== keywordToRemove)
        .join(" ");
    },

    statusLabel(status) {
      if (status === "pending") {
        return "Pending Review";
      }

      if (status === "available") {
        return "Available";
      }

      if (status === "returned") {
        return "Returned";
      }

      return status;
    }
  },

  mounted() {
    this.loadItems();
  }
};
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #e8e3d8;
  color: #1f2933;
  font-family: Arial, sans-serif;
}

.page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 28px;
}

.back-button {
  margin-bottom: 24px;
  background: #2c2c2c;
  border: 0;
  padding: 12px 32px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  color: #f5f5f5;
  border-radius: 32px;
  transition: background 0.2s ease, transform 0.2s ease;
}

.back-button:hover {
  background: #1a1a1a;
  transform: translateY(-2px);
}

/* Landing Page Styles */
.landing-page {
  min-height: 100vh;
  padding: 64px 74px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #e8e3d8;
}

.landing-card {
  width: min(1220px, 100%);
  min-height: 590px;
  background: #e8e3d8;
  padding: 24px 12px 0 12px;
  position: relative;
  box-shadow: 0 22px 55px rgba(15, 23, 42, 0.06);
  overflow: hidden;
  border-radius: 4px;
}

.main-title {
  margin: 0;
  font-family: Impact, "Arial Black", Haettenschweiler, sans-serif;
  font-size: clamp(126px, 14.2vw, 216px);
  line-height: 0.8;
  font-weight: 900;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transform: scaleX(0.93);
  transform-origin: left center;
  color: #030303;
}

.landing-content {
  position: relative;
  margin-top: 6px;
  display: grid;
  grid-template-columns: 560px 1fr;
  gap: 42px;
  align-items: flex-start;
  padding-top: 48px;
}

.landing-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.landing-link {
  background: transparent;
  border: 0;
  padding: 0;
  margin: 0 0 16px 0;
  font-family: Arial, Helvetica, sans-serif;
  font-size: clamp(41px, 4.5vw, 62px);
  line-height: 0.93;
  font-weight: 900;
  color: #030303;
  letter-spacing: -2px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.landing-link:hover {
  transform: translateX(12px);
  opacity: 0.62;
}

.side-note {
  min-height: 178px;
  padding-top: 10px;
  font-size: 22px;
  line-height: 1.25;
  font-weight: 400;
  opacity: 0;
  transform: translateX(-8px);
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  max-width: 440px;
  color: #030303;
}

.side-note.show {
  opacity: 1;
  transform: translateX(0);
}

.side-note strong {
  display: block;
  font-size: 34px;
  line-height: 1;
  letter-spacing: -1px;
  margin-bottom: 12px;
  font-weight: 900;
}

.side-note span {
  display: block;
  margin-top: 14px;
  font-weight: 900;
}

.admin-link {
  display: none;
  margin-top: 54px;
  background: transparent;
  border: 0;
  padding: 0;
  font-family: Arial, Helvetica, sans-serif;
  font-size: clamp(30px, 3vw, 38px);
  line-height: 1;
  font-weight: 400;
  color: #030303;
  cursor: pointer;
  text-align: left;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.admin-link.show {
  display: block;
}

.admin-link:hover {
  opacity: 0.6;
  transform: translateX(8px);
}

@media (max-width: 900px) {
  .landing-page {
    padding: 20px;
  }

  .landing-card {
    min-height: 620px;
    padding: 18px 12px;
  }

  .main-title {
    white-space: normal;
    font-size: clamp(78px, 18vw, 132px);
    letter-spacing: 0;
  }

  .landing-content {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .landing-link {
    font-size: clamp(36px, 9vw, 58px);
  }

  .side-note {
    min-height: 120px;
    font-size: 18px;
  }
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 12px;
  font-weight: bold;
  color: #8b5e34;
}

.section {
  background: #e8e3d8;
  border-radius: 28px;
  padding: 30px;
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  margin-bottom: 24px;
}

.section h2 {
  margin-top: 0;
  font-size: 34px;
}

.search-area {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search {
  width: 360px;
  max-width: 100%;
  padding: 14px 16px;
  border-radius: 999px;
  border: 1px solid #ddd;
}

.filter-button {
  border-radius: 999px;
  padding: 14px 20px;
}

.filters {
  background: #fafafa;
  border: 1px solid #eee;
  padding: 18px;
  border-radius: 20px;
  margin-bottom: 22px;
  display: grid;
  grid-template-columns: 1fr 2fr auto;
  gap: 12px;
  align-items: end;
}

.date-filter {
  display: flex;
  gap: 12px;
}

.date-filter label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  font-weight: bold;
  color: #555;
}

.clear-button {
  background: #6b7280;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
}

.card {
  border-radius: 22px;
  overflow: hidden;
  background: #fafafa;
  border: 1px solid #eee;
}

.card img {
  width: 100%;
  height: 190px;
  object-fit: cover;
}

.card-image {
  cursor: pointer;
  transition: transform 0.2s ease, filter 0.2s ease;
}

.card-image:hover {
  transform: scale(1.05);
  filter: brightness(1.1);
}

.card-body {
  padding: 18px;
}

.status {
  display: inline-block;
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: bold;
  background: #eee;
}

.status.pending {
  background: #fef3c7;
}

.status.available {
  background: #dbeafe;
}

.status.returned {
  background: #dcfce7;
}

.tag-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.tag {
  display: inline-block;
  background: #f5efe6;
  color: #8b5e34;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: bold;
}

.removable {
  cursor: pointer;
}

.form {
  display: grid;
  gap: 14px;
  max-width: 680px;
}

input,
textarea,
select {
  padding: 14px;
  border: 1px solid #ddd;
  border-radius: 14px;
  font-size: 15px;
  background: white;
}

textarea {
  min-height: 110px;
}

button {
  padding: 13px 16px;
  border: none;
  border-radius: 14px;
  background: #111827;
  color: white;
  font-weight: bold;
  cursor: pointer;
}

.message {
  background: #dcfce7;
  padding: 14px;
  border-radius: 14px;
  margin-top: 14px;
}

.empty {
  color: #777;
}

.admin-login {
  display: flex;
  gap: 12px;
}

.admin-filters {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 12px;
  margin-bottom: 18px;
}

.admin-list {
  display: grid;
  gap: 14px;
}

.admin-card {
  border: 1px solid #eee;
  background: #fffdf9;
  padding: 20px;
  border-radius: 18px;
  box-shadow: 0 10px 24px rgba(17, 24, 39, 0.06);
}

.admin-card > div:first-child p {
  color: #6b7280;
  margin: 8px 0 10px;
}

.admin-actions {
  display: flex;
  gap: 10px;
  margin: 12px 0;
  flex-wrap: wrap;
}

.edit-toggle {
  background: #f5efe6;
  color: #8b5e34;
  border: 1px solid #eadfce;
  border-radius: 999px;
  padding: 9px 14px;
  font-size: 13px;
  margin-top: 4px;
}

.danger {
  background: #dc2626;
}

.edit-panel {
  background: #fff8ed;
  border: 1px solid #eadfce;
  border-radius: 18px;
  margin-top: 16px;
  padding: 18px;
}

.edit-panel h3 {
  margin: 0 0 14px;
  font-size: 20px;
}

.edit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.edit-grid input,
.edit-grid textarea,
.edit-grid select {
  width: 100%;
}

.edit-description {
  grid-column: 1 / -1;
}

.keyword-editor {
  margin-top: 14px;
}

.keyword-editor label {
  font-weight: bold;
}

.keyword-input-row {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  align-items: center;
}

.keyword-input-row input {
  flex: 1;
}

.keyword-input-row button {
  padding: 10px 13px;
  border-radius: 12px;
  font-size: 13px;
  white-space: nowrap;
}

.save-button {
  display: block;
  width: 100%;
  margin-top: 18px;
}

@media (max-width: 900px) {
  .filters,
  .admin-filters {
    grid-template-columns: 1fr;
  }

  .date-filter {
    display: grid;
    grid-template-columns: 1fr;
  }

  .edit-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 800px) {
  .hero h1 {
    font-size: 42px;
  }

  .split,
  .section-title,
  .search-area {
    display: grid;
    grid-template-columns: 1fr;
  }

  .page {
    padding: 16px;
  }

  .keyword-input-row {
    display: grid;
    grid-template-columns: 1fr;
  }
}

/* Photo Modal Styles */
.photo-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.photo-modal-content {
  position: relative;
  max-width: 90%;
  max-height: 90vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.photo-modal-content img {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
}

.photo-close-button {
  position: absolute;
  top: -40px;
  right: 0;
  background: none;
  border: none;
  color: white;
  font-size: 48px;
  cursor: pointer;
  padding: 0;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, color 0.2s ease;
}

.photo-close-button:hover {
  transform: scale(1.2);
  color: #ddd;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
