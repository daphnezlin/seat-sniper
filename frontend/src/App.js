import { useState, useEffect } from "react"

const API = "http://localhost:8000"

export default function App() {
  const [phone, setPhone] = useState("")
  const [courseCode, setCourseCode] = useState("")
  const [term, setTerm] = useState("1265")
  const [watching, setWatching] = useState([])
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`${API}/courses`)
      .then(r => r.json())
      .then(setWatching)
      .catch(() => {})
  }, [])

  const addWatch = async () => {
    if (!phone || !courseCode) {
      setStatus("Please fill in both fields")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API}/watch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, course_code: courseCode.toUpperCase(), term })
      })

      if (res.ok) {
        setStatus(`✓ Now watching ${courseCode.toUpperCase()}! You'll get a text when a seat opens.`)
        setWatching([...watching, { course_code: courseCode.toUpperCase(), term }])
        setCourseCode("")
      } else {
        setStatus("Something went wrong. Try again.")
      }
    } catch {
      setStatus("Can't connect to server. Is it running?")
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 500, margin: "60px auto", fontFamily: "sans-serif", padding: "0 20px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>📚 UW Seat Sniper</h1>
      <p style={{ color: "#666", marginBottom: 30 }}>
        Get a text the instant a seat opens in your course.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          placeholder="Phone number e.g. +16471234567"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          style={{ padding: 12, fontSize: 16, border: "1px solid #ddd", borderRadius: 6 }}
        />
        <input
          placeholder="Course code e.g. CS246"
          value={courseCode}
          onChange={e => setCourseCode(e.target.value)}
          style={{ padding: 12, fontSize: 16, border: "1px solid #ddd", borderRadius: 6 }}
        />
        <select
          value={term}
          onChange={e => setTerm(e.target.value)}
          style={{ padding: 12, fontSize: 16, border: "1px solid #ddd", borderRadius: 6 }}
        >
          <option value="1265">Spring 2026</option>
          <option value="1269">Fall 2026</option>
        </select>
        <button
          onClick={addWatch}
          disabled={loading}
          style={{
            padding: 14,
            fontSize: 16,
            background: loading ? "#93c5fd" : "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Adding..." : "Watch this course"}
        </button>
      </div>

      {status && (
        <p style={{ marginTop: 16, color: status.startsWith("✓") ? "green" : "red" }}>
          {status}
        </p>
      )}

      {watching.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h3 style={{ marginBottom: 12 }}>Currently watching</h3>
          {watching.map((c, i) => (
            <div key={i} style={{
              padding: 12,
              background: "#f3f4f6",
              borderRadius: 6,
              marginBottom: 8,
              fontSize: 15
            }}>
              📖 {c.course_code} — Term {c.term}
            </div>
          ))}
        </div>
      )}

      <p style={{ marginTop: 40, fontSize: 13, color: "#999" }}>
        Built for UW students. Checks every 60 seconds between 8am–8pm.
      </p>
    </div>
  )
}