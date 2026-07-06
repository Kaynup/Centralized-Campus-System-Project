const API = "http://localhost:8000";


// AUTH (ADMIN)
export const loginAdmin = async ({ email, password }) => {
  const res = await fetch(`${API}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.detail || "Login failed");
  return result;
};


// ADMIN - DASHBOARD
export const getAdminDashboard = async () => {
  const res = await fetch(`${API}/admin/dashboard`);
  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.detail || "Failed to load dashboard");
  return result;
};


// ADMIN - STUDENTS
export const getStudents = async () => {
  const res = await fetch(`${API}/admin/students`);
  return res.json();
};

export const createStudent = async (student) => {
  const res = await fetch(`${API}/admin/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(student),
  });

  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.detail || "Failed to create student");
  return result;
};

export const activateStudent = async (id) => {
  const res = await fetch(`${API}/admin/students/${id}/activate`, {
    method: "PATCH",
  });

  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.detail || "Failed to activate student");
  return result;
};

export const deactivateStudent = async (id) => {
  const res = await fetch(`${API}/admin/students/${id}/deactivate`, {
    method: "PATCH",
  });

  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.detail || "Failed to deactivate student");
  return result;
};

export const addBalance = async (id, amount) => {
  const res = await fetch(`${API}/admin/students/${id}/add-balance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({amount: Number(amount),}),
  });

  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.detail || "Failed to add balance");
  return result;
};


// ADMIN - EQUIPMENT
export const getEquipments = async () => {
  const res = await fetch(`${API}/admin/equipments`);
  return res.json();
};

export const createEquipment = async (equipment) => {
  const res = await fetch(`${API}/admin/equipments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(equipment),
  });

  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.detail || "Failed to add equipment");
  return result;
};

export const updateEquipment = async (id, equipment) => {
  const res = await fetch(`${API}/admin/equipments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(equipment),
  });

  const result = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      result?.message ||
      result?.error ||
      "Failed to update equipment";

    throw new Error(message);
  }

  return result;
};

export const activateEquipment = async (id) => {
  const res = await fetch(
    `${API}/admin/equipments/${id}/activate`,
    {
      method: "PATCH",
    }
  );

  const result = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(result.detail || "Failed to activate equipment");
  }

  return result;
};

export const deactivateEquipment = async (id) => {
  const res = await fetch(
    `${API}/admin/equipments/${id}/deactivate`,
    {
      method: "PATCH",
    }
  );

  const result = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(result.detail || "Failed to deactivate equipment");
  }

  return result;
};

// ADMIN - RENTALS
export const getAllRentals = async () => {
  const res = await fetch(`${API}/admin/rentals`);
  return res.json();
};

export const getLateRentals = async () => {
  const res = await fetch(`${API}/admin/rentals/late`);
  return res.json();
};

//ADMIN-TRANSACTIONS
export const getTransactions = async () => {
  const res = await fetch(`${API}/admin/transactions`);
  return res.json();
};

export const getEquipmentCategories = async () => {
  const res = await fetch(`${API}/admin/equipment-categories`);
  const result = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(result.detail || "Failed to load categories");
  }

  return result;
};