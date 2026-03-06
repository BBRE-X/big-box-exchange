import { createCompanyAction } from "./actions";

export default function CreateCompanyPage() {
  return (
    <div style={{ maxWidth: 520, margin: "40px auto", padding: 18 }}>
      <h1 style={{ marginBottom: 6 }}>Create your company</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Big Box Exchange is company-centric. Your company owns mandates, deal
        rooms, and portfolios.
      </p>

      <form action={createCompanyAction} style={{ display: "grid", gap: 12 }}>
        <label>
          Company name
          <input
            name="name"
            placeholder="e.g., Big Box Capital"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ddd",
              marginTop: 6,
            }}
          />
        </label>

        <label>
          Entity type
          <select
            name="entity_type"
            defaultValue="principal"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "1px solid #ddd",
              marginTop: 6,
            }}
          >
            <option value="principal">Principal / Acquiring Entity</option>
            <option value="agency">Agency / Supply Entity</option>
            <option value="service_provider">Service Provider</option>
          </select>
        </label>

        <button
          type="submit"
          style={{
            padding: 12,
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Create company
        </button>
      </form>
    </div>
  );
}