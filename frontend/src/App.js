import { useState, useEffect, useRef } from "react"

const API = "https://seat-sniper-production.up.railway.app"

export default function App() {
  const [phone, setPhone] = useState("")
  const [subject, setSubject] = useState("")
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [term, setTerm] = useState("1265")
  const [watching, setWatching] = useState([])
  const [status, setStatus] = useState("")
  const [stopStatus, setStopStatus] = useState("")
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [courses, setCourses] = useState([])
  const searchTimeout = useRef(null)

  useEffect(() => {
    fetch(`${API}/courses`)
      .then(r => r.json())
      .then(setWatching)
      .catch(() => {})
  }, [])

  const handleSubjectChange = (e) => {
    const val = e.target.value
    setSubject(val)
    setSelectedCourse(null)
    setCourses([])
    setStatus("")

    // Debounce — wait 500ms after user stops typing before searching
    clearTimeout(searchTimeout.current)
    if (val.length < 2) return

    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`${API}/search?subject=${val.toUpperCase()}&term=${term}`)
        const data = await res.json()
        setCourses(data.courses || [])
      } catch {
        setCourses([])
      }
      setSearching(false)
    }, 500)
  }

  const addWatch = async () => {
    if (!phone) {
      setStatus("Please enter your phone number")
      return
    }
    if (!selectedCourse) {
      setStatus("Please select a course from the dropdown")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API}/watch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, course_code: selectedCourse.code, term })
      })

      if (res.ok) {
        setStatus(`✓ Now watching ${selectedCourse.code} — ${selectedCourse.title}! You'll get a text when a seat opens.`)
        setWatching([...watching, { course_code: selectedCourse.code, term }])
        setSubject("")
        setSelectedCourse(null)
        setCourses([])
      } else {
        setStatus("Something went wrong. Try again.")
      }
    } catch {
      setStatus("Can't connect to server.")
    }
    setLoading(false)
  }

  const stopWatch = async (course_code, term) => {
    if (!phone) {
      setStopStatus("Enter your phone number above first.")
      return
    }
    try {
      const res = await fetch(
        `${API}/watch?phone=${encodeURIComponent(phone)}&course_code=${course_code}&term=${term}`,
        { method: "DELETE" }
      )
      if (res.ok) {
        setWatching(watching.filter(c => !(c.course_code === course_code && c.term === term)))
        setStopStatus(`✓ Stopped watching ${course_code}.`)
      } else {
        setStopStatus("Something went wrong. Try again.")
      }
    } catch {
      setStopStatus("Can't connect to server.")
    }
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
          placeholder="Subject e.g. CS, MATH, STAT"
          value={subject}
          onChange={handleSubjectChange}
          style={{ padding: 12, fontSize: 16, border: "1px solid #ddd", borderRadius: 6 }}
        />

        {searching && (
          <p style={{ margin: 0, color: "#999", fontSize: 14 }}>Searching...</p>
        )}

        {courses.length > 0 && !selectedCourse && (
          <select
            size={Math.min(courses.length, 8)}
            onChange={e => {
              const course = courses.find(c => c.code === e.target.value)
              setSelectedCourse(course)
            }}
            style={{ padding: 8, fontSize: 15, border: "1px solid #ddd", borderRadius: 6 }}
          >
            {courses.map(c => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.title}
              </option>
            ))}
          </select>
        )}

        {selectedCourse && (
          <div style={{
            padding: 12,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 6,
            fontSize: 15,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span>✓ {selectedCourse.code} — {selectedCourse.title}</span>
            <button
              onClick={() => { setSelectedCourse(null); setCourses([]) }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: 18 }}
            >
              ✕
            </button>
          </div>
        )}

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
          disabled={loading || !selectedCourse}
          style={{
            padding: 14,
            fontSize: 16,
            background: loading || !selectedCourse ? "#93c5fd" : "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: loading || !selectedCourse ? "not-allowed" : "pointer"
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
          {stopStatus && (
            <p style={{ fontSize: 13, color: stopStatus.startsWith("✓") ? "green" : "red", marginBottom: 8 }}>
              {stopStatus}
            </p>
          )}
          {watching.map((c, i) => (
            <div key={i} style={{
              padding: 12,
              background: "#f3f4f6",
              borderRadius: 6,
              marginBottom: 8,
              fontSize: 15,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span>📖 {c.course_code} — Term {c.term}</span>
              <button
                onClick={() => stopWatch(c.course_code, c.term)}
                style={{
                  padding: "4px 12px",
                  background: "white",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  cursor: "pointer",
                  color: "#ef4444",
                  fontSize: 13
                }}
              >
                Stop watching
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 30, padding: 16, background: "#f9fafb", borderRadius: 6, fontSize: 13, color: "#666" }}>
        <strong>How to stop all texts:</strong> Reply <strong>STOP</strong> to the number that texted you. Reply <strong>START</strong> to resume.
      </div>

      <p style={{ marginTop: 20, fontSize: 13, color: "#999" }}>
        Built for UW students. Checks every 60 seconds between 8am–8pm.
      </p>
    </div>
  )
}