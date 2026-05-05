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
  const [showDropdown, setShowDropdown] = useState(false)
  const searchTimeout = useRef(null)
  const containerRef = useRef(null)

  const showStatus = (msg, setter) => {
    setter(msg)
    setTimeout(() => setter(""), 10000)
  }

  useEffect(() => {
    fetch(`${API}/courses`)
      .then(r => r.json())
      .then(setWatching)
      .catch(() => {})
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleSubjectChange = (e) => {
    const val = e.target.value
    setSubject(val)
    setSelectedCourse(null)
    setCourses([])
    setShowDropdown(false)
    setStatus("")

    clearTimeout(searchTimeout.current)
    if (val.length < 2) return

    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`${API}/search?subject=${val.toUpperCase()}&term=${term}`)
        const data = await res.json()
        if (data.courses && data.courses.length > 0) {
          setCourses(data.courses)
          setShowDropdown(true)
        }
      } catch {
        setCourses([])
      }
      setSearching(false)
    }, 500)
  }

  const selectCourse = (course) => {
    setSelectedCourse(course)
    setSubject(course.code)
    setShowDropdown(false)
  }

  const addWatch = async () => {
    if (!phone) {
      showStatus("Please enter your phone number", setStatus)
      return
    }
    if (!selectedCourse) {
      showStatus("Please select a course from the dropdown", setStatus)
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
        showStatus(`✓ Now watching ${selectedCourse.code}! You'll get a text when a seat opens.`, setStatus)
        setWatching([...watching, { course_code: selectedCourse.code, term }])
        setSubject("")
        setSelectedCourse(null)
        setCourses([])
      } else {
        showStatus("Something went wrong. Try again.", setStatus)
      }
    } catch {
      showStatus("Can't connect to server.", setStatus)
    }
    setLoading(false)
  }

  const stopWatch = async (course_code, term) => {
    if (!phone) {
      showStatus("Enter your phone number above first.", setStopStatus)
      return
    }
    try {
      const res = await fetch(
        `${API}/watch?phone=${encodeURIComponent(phone)}&course_code=${course_code}&term=${term}`,
        { method: "DELETE" }
      )
      if (res.ok) {
        setWatching(watching.filter(c => !(c.course_code === course_code && c.term === term)))
        showStatus(`✓ Stopped watching ${course_code}.`, setStopStatus)
      } else {
        showStatus("Something went wrong. Try again.", setStopStatus)
      }
    } catch {
      showStatus("Can't connect to server.", setStopStatus)
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

        {/* Course search with attached dropdown */}
        <div ref={containerRef} style={{ position: "relative" }}>
          <input
            placeholder="Search by subject e.g. CS, MATH, STAT"
            value={subject}
            onChange={handleSubjectChange}
            onFocus={() => courses.length > 0 && setShowDropdown(true)}
            style={{
              padding: 12,
              fontSize: 16,
              border: "1px solid #ddd",
              borderRadius: showDropdown ? "6px 6px 0 0" : "6px",
              width: "100%",
              boxSizing: "border-box",
              outline: "none"
            }}
          />

          {searching && (
            <div style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#999",
              fontSize: 13
            }}>
              Searching...
            </div>
          )}

          {showDropdown && courses.length > 0 && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "white",
              border: "1px solid #ddd",
              borderTop: "none",
              borderRadius: "0 0 6px 6px",
              maxHeight: 240,
              overflowY: "auto",
              zIndex: 100,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}>
              {courses.map(c => (
                <div
                  key={c.code}
                  onClick={() => selectCourse(c)}
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    fontSize: 14,
                    borderBottom: "1px solid #f3f4f6",
                    display: "flex",
                    gap: 10
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"}
                  onMouseLeave={e => e.currentTarget.style.background = "white"}
                >
                  <span style={{ fontWeight: 600, minWidth: 70 }}>{c.code}</span>
                  <span style={{ color: "#666" }}>{c.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedCourse && (
          <div style={{
            padding: 12,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 6,
            fontSize: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span>✓ {selectedCourse.code} — {selectedCourse.title}</span>
            <button
              onClick={() => { setSelectedCourse(null); setSubject(""); setCourses([]) }}
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