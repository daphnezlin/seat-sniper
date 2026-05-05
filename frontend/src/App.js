import { useState, useEffect, useRef } from "react"

const API = "https://seat-sniper-production.up.railway.app"

export default function App() {
  const [phone, setPhone] = useState("")
  const [phoneDisplay, setPhoneDisplay] = useState("")
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
  if (val.length < 1) return

  searchTimeout.current = setTimeout(async () => {
    setSearching(true)
    try {
      const match = val.match(/^([a-zA-Z]+)(\d*.*)$/)
      const subjectPart = match ? match[1].toUpperCase() : val.toUpperCase()
      const catalogPart = match ? match[2] : ""

      const url = `${API}/search?subject=${subjectPart}&term=${term}${catalogPart ? `&cournum=${catalogPart}` : ""}`
      const res = await fetch(url)
      const data = await res.json()

      if (data.courses && data.courses.length > 0) {
        setCourses(data.courses)
        setShowDropdown(true)
      }
    } catch {
      setCourses([])
    }
    setSearching(false)
  }, 300)
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
    <div style={{ minHeight: "100vh", background: "#FFD700", padding: "20px" }}>
      <div style={{ maxWidth: 500, margin: "0 auto", fontFamily: "Inter", padding: "40px 20px" }}>
        <h1 style={{ fontSize: 28, marginBottom: 4, color: "#333" }}>UWaterloo Course Openings</h1>
        <p style={{ color: "#555", marginBottom: 30 }}>
          Get a text when a spot in a course opens up
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            placeholder="Phone number e.g. (647) 123-4567"
            value={phoneDisplay}
            onChange={e => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
              const prevDigits = phone.replace("+1", "")
              const isDeleting = digits.length < prevDigits.length
              
              let formatted = ""
              if (digits.length === 0) {
                formatted = ""
              } else if (digits.length < 3) {
                formatted = `(${digits}`
              } else if (digits.length === 3) {
                formatted = isDeleting ? `(${digits}` : `(${digits}) `
              } else if (digits.length < 6) {
                formatted = `(${digits.slice(0,3)}) ${digits.slice(3)}`
              } else if (digits.length === 6) {
                formatted = isDeleting ? `(${digits.slice(0,3)}) ${digits.slice(3)}` : `(${digits.slice(0,3)}) ${digits.slice(3)}-`
              } else {
                formatted = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
              }
              setPhoneDisplay(formatted)
              setPhone("+1" + digits)
            }}
            style={{ padding: 12, fontSize: 16, border: "1px solid #c8a800", borderRadius: 0, background: "#FFF8DC", color: "#333" }}
          />

          <div ref={containerRef} style={{ position: "relative" }}>
            <input
              placeholder="Search by subject e.g. CS, MATH, STAT"
              value={subject}
              onChange={handleSubjectChange}
              onFocus={() => courses.length > 0 && setShowDropdown(true)}
              style={{
                padding: 12,
                fontSize: 16,
                border: "1px solid #c8a800",
                borderRadius: 0,
                width: "100%",
                boxSizing: "border-box",
                outline: "none",
                background: "#FFF8DC",
                color: "#333"
              }}
            />

            {searching && (
              <div style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#888",
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
                background: "#FFF8DC",
                border: "1px solid #c8a800",
                borderTop: "none",
                borderRadius: 0,
                maxHeight: 240,
                overflowY: "auto",
                zIndex: 100,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
              }}>
                {courses.map(c => (
                  <div
                    key={c.code}
                    onClick={() => selectCourse(c)}
                    style={{
                      padding: "10px 14px",
                      cursor: "pointer",
                      fontSize: 14,
                      borderBottom: "1px solid #e8d080",
                      display: "flex",
                      gap: 10,
                      color: "#333"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F5E88A"}
                    onMouseLeave={e => e.currentTarget.style.background = "#FFF8DC"}
                  >
                    <span style={{ fontWeight: 600, minWidth: 70, color: "#000000" }}>{c.code}</span>
                    <span style={{ color: "#666" }}>{c.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedCourse && (
            <div style={{
              padding: 12,
              background: "#FFF8DC",
              border: "1px solid #c8a800",
              borderRadius: 0,
              fontSize: 14,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "#333"
            }}>
              <span>✓ {selectedCourse.code} — {selectedCourse.title}</span>
              <button
                onClick={() => { setSelectedCourse(null); setSubject(""); setCourses([]) }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 18 }}
              >
                ✕
              </button>
            </div>
          )}

          <select
            value={term}
            onChange={e => setTerm(e.target.value)}
            style={{ padding: 12, fontSize: 16, border: "1px solid #c8a800", borderRadius: 0, background: "#FFF8DC", color: "#333" }}
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
              background: loading || !selectedCourse ? "#c8a800" : "#000000",
              color: loading || !selectedCourse ? "#FFF8DC" : "#FFF8DC",
              border: "none",
              borderRadius: 0,
              cursor: loading || !selectedCourse ? "not-allowed" : "pointer",
              fontWeight: 600
            }}
          >
            {loading ? "Adding..." : "Track this course"}
          </button>
        </div>

        {status && (
          <p style={{ marginTop: 16, color: status.startsWith("✓") ? "#4a3800" : "#8b0000", fontWeight: 600 }}>
            {status}
          </p>
        )}

        {watching.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h3 style={{ marginBottom: 0, color: "#000000", background: "#FFF8DC", padding: "12px 16px", border: "none" }}>Currently watching</h3>
            {stopStatus && (
              <p style={{ fontSize: 13, color: stopStatus.startsWith("✓") ? "#4a3800" : "#8b0000", margin: 0, padding: "8px 16px", background: "#FFF8DC", borderLeft: "1px solid #c8a800", borderRight: "1px solid #c8a800", fontWeight: 600 }}>
                {stopStatus}
              </p>
            )}
            <div style={{ border: "none" }}>
              {watching.map((c, i) => (
                <div key={i} style={{
                  padding: "12px 16px",
                  background: "#FFF8DC",
                  fontSize: 15,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  color: "#333",
                  borderBottom: "none"
                }}>
                  <span>{c.course_code} ({{"1259": "Fall 2025", "1261": "Winter 2026", "1265": "Spring 2026", "1269": "Fall 2026"}[c.term] || c.term})</span>
                  <button
                    onClick={() => stopWatch(c.course_code, c.term)}
                    style={{
                      padding: "4px 12px",
                      background: "#FFF8DC",
                      border: "1px solid #c8a800",
                      borderRadius: 0,
                      cursor: "pointer",
                      color: "#000000",
                      fontSize: 13
                    }}
                  >
                    Stop watching
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p style={{ marginTop: 30, fontSize: 13, color: "#333" }}>
          <strong>To stop all texts:</strong> reply <strong>STOP</strong> to the number that texted you. Reply <strong>START</strong> to resume.
        </p>

        <p style={{ marginTop: 0, fontSize: 13, color: "#333" }}>
          Built for UW students. Checks every 60 seconds between 8am–8pm.
        </p>
      </div>
    </div>
  )
}