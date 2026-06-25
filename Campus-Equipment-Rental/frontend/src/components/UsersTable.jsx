import { useEffect, useState } from "react";
import AdminTableLayout from "./AdminTableLayout";
import AddStudent from "./AddStudent";
import AddBalance from "./AddBalance";
import { getStudents, activateStudent, deactivateStudent } from "../api/api";

export default function UsersTable() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [accountFilter, setAccountFilter] = useState("all");
  const [registrationFilter, setRegistrationFilter] = useState("all");

  useEffect(() => {
    async function fetchStudents() {
      try {
        const data = await getStudents();
        setStudents(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchStudents();
  }, []);

  async function handleActivate(id) {
    await activateStudent(id);

    setStudents((prev) =>
      prev.map((student) =>
        student.id === id ? { ...student, is_active: true } : student
      )
    );
  }

  async function handleDeactivate(id) {
    await deactivateStudent(id);

    setStudents((prev) =>
      prev.map((student) =>
        student.id === id ? { ...student, is_active: false } : student
      )
    );
  }

  const filteredStudents = students.filter((student) => {
    const matchesAccount =
      accountFilter === "all"
        ? true
        : accountFilter === "active"
        ? student.is_active
        : !student.is_active;

    const matchesRegistration =
      registrationFilter === "all"
        ? true
        : registrationFilter === "complete"
        ? student.registration_completed
        : !student.registration_completed;

    return matchesAccount && matchesRegistration;
  });

  const filters = (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {/* ACCOUNT FILTERS */}
      <button
        onClick={() => setAccountFilter("all")}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
          accountFilter === "all"
            ? "bg-stone-900 text-white shadow-sm"
            : "bg-white border border-stone-200 text-stone-600"
        }`}
      >
        All Accounts
      </button>

      <button
        onClick={() => setAccountFilter("active")}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
          accountFilter === "active"
            ? "bg-green-600 text-white shadow-sm"
            : "bg-white border border-stone-200 text-stone-600"
        }`}
      >
        Active
      </button>

      <button
        onClick={() => setAccountFilter("inactive")}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
          accountFilter === "inactive"
            ? "bg-red-600 text-white shadow-sm"
            : "bg-white border border-stone-200 text-stone-600"
        }`}
      >
        Inactive
      </button>

      {/* REGISTRATION FILTERS */}
      <button
        onClick={() => setRegistrationFilter("all")}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
          registrationFilter === "all"
            ? "bg-stone-900 text-white shadow-sm"
            : "bg-white border border-stone-200 text-stone-600"
        }`}
      >
        All Registration
      </button>

      <button
        onClick={() => setRegistrationFilter("complete")}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
          registrationFilter === "complete"
            ? "bg-blue-600 text-white shadow-sm"
            : "bg-white border border-stone-200 text-stone-600"
        }`}
      >
        Registration Complete
      </button>

      <button
        onClick={() => setRegistrationFilter("incomplete")}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
          registrationFilter === "incomplete"
            ? "bg-amber-500 text-white shadow-sm"
            : "bg-white border border-stone-200 text-stone-600"
        }`}
      >
        Registration Incomplete
      </button>

      {/* CLEAR */}
      <button
        onClick={() => {
          setAccountFilter("all");
          setRegistrationFilter("all");
        }}
        className="ml-auto px-4 py-2 rounded-full text-sm font-medium border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
      >
        Clear Filters
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8">
        Loading students...
      </div>
    );
  }

  return (
    <AdminTableLayout
      sectionLabel="Manage"
      title="Students"
      action={
        <button
          onClick={() => setAddOpen(true)}
          className="btn-primary text-[13px] px-5"
        >
          Add Student
        </button>
      }
    >
      {/* FILTER BAR  */}
      <div className="px-6 pt-4">{filters}</div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-stone-100">
            <th className="text-left px-6 py-4 text-xs tracking-widest text-stone-400">
              Student ID
            </th>
            <th className="text-left px-6 py-4 text-xs tracking-widest text-stone-400">
              Name
            </th>
            <th className="text-left px-6 py-4 text-xs tracking-widest text-stone-400">
              Email
            </th>
            <th className="text-left px-6 py-4 text-xs tracking-widest text-stone-400">
              Wallet
            </th>
            <th className="text-left px-6 py-4 text-xs tracking-widest text-stone-400">
              Status
            </th>
            <th className="text-left px-6 py-4 text-xs tracking-widest text-stone-400">
              Registration
            </th>
            <th className="text-left px-6 py-4 text-xs tracking-widest text-stone-400">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {filteredStudents.map((student, index) => (
            <tr
              key={student.id}
              className={`border-b border-stone-50 hover:bg-stone-50 ${
                index === filteredStudents.length - 1 ? "border-none" : ""
              }`}
            >
              <td className="px-6 py-4 text-sm text-stone-700">
                {student.student_id}
              </td>

              <td className="px-6 py-4 text-sm text-stone-700">
                {student.full_name}
              </td>

              <td className="px-6 py-4 text-sm text-stone-700">
                {student.email}
              </td>

              <td className="px-6 py-4 text-sm text-stone-700">
                Rs. {student.wallet_balance}
              </td>

              <td className="px-6 py-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    student.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {student.is_active ? "Active" : "Inactive"}
                </span>
              </td>

              <td className="px-6 py-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    student.registration_completed
                      ? "bg-blue-100 text-blue-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {student.registration_completed
                    ? "Complete"
                    : "Incomplete"}
                </span>
              </td>

              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedStudent(student)}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    Add Balance
                  </button>

                  {student.is_active ? (
                    <button
                      onClick={() => handleDeactivate(student.id)}
                      className="text-red-500 text-sm hover:underline"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleActivate(student.id)}
                      className="text-green-600 text-sm hover:underline"
                    >
                      Activate
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {addOpen && (
        <AddStudent
          onClose={() => setAddOpen(false)}
          onSuccess={async () => {
            const data = await getStudents();
            setStudents(data);
          }}
        />
      )}

      {selectedStudent && (
        <AddBalance
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onSuccess={async () => {
            const data = await getStudents();
            setStudents(data);
          }}
        />
      )}
    </AdminTableLayout>
  );
}