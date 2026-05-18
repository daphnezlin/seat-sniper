import { useState, useEffect, useRef } from "react"

const API = "https://seat-sniper-production.up.railway.app"

export default function App() {
  const [phone, setPhone] = useState("")
  const [phoneDisplay, setPhoneDisplay] = useState("")
  const [email, setEmail] = useState("")
  const [phoneEnabled, setPhoneEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)
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

  const notifyMethod = phoneEnabled && emailEnabled ? "both" : phoneEnabled ? "sms" : "email"

  const togglePhone = () => {
    if (phoneEnabled && !emailEnabled) return // can't turn off both
    setPhoneEnabled(!phoneEnabled)
  }

  const toggleEmail = () => {
    if (emailEnabled && !phoneEnabled) return // can't turn off both
    setEmailEnabled(!emailEnabled)
  }

  useEffect(() => {
    if (!phone || phone === "+1") return
    fetch(`${API}/courses?phone=${encodeURIComponent(phone)}`)
      .then(r => r.json())
      .then(setWatching)
      .catch(() => {})
  }, [phone])

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
    if (phoneEnabled && (!phone || phone === "+1")) {
      showStatus("Please enter your phone number", setStatus)
      return
    }
    if (emailEnabled && !email) {
      showStatus("Please enter your email address", setStatus)
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
        body: JSON.stringify({
          phone: phoneEnabled ? phone : "",
          email: emailEnabled ? email : "",
          notify_method: notifyMethod,
          course_code: selectedCourse.code,
          term
        })
      })

      if (res.ok) {
        const method = notifyMethod === "sms" ? "text" : notifyMethod === "email" ? "email" : "text and email"
        showStatus(`✓ Now watching ${selectedCourse.code}! You'll get a ${method} when a seat opens.`, setStatus)
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

  const inputStyle = {
    padding: 12,
    fontSize: 15,
    border: "1px solid #c8a800",
    borderRadius: 0,
    background: "#FFF8DC",
    color: "#333",
    fontFamily: "Didact Gothic",
    width: "100%",
    boxSizing: "border-box"
  }

  const disabledInputStyle = {
    ...inputStyle,
    background: "#e8d870",
    color: "#999",
    cursor: "not-allowed"
  }

  const Toggle = ({ enabled, onToggle }) => (
    <div
      onClick={onToggle}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        background: enabled ? "#000000" : "#c8a800",
        position: "relative",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 0.2s"
      }}
    >
      <div style={{
        position: "absolute",
        top: 3,
        left: enabled ? 20 : 3,
        width: 16,
        height: 16,
        background: "#FFD700",
        borderRadius: 8,
        transition: "left 0.2s"
      }} />
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#FFD700", padding: "40px 20px" }}>
      <div style={{ maxWidth: 500, margin: "0 auto", fontFamily: "Didact Gothic" }}>
        <h1 style={{ fontSize: 32, marginBottom: 8, color: "#1a1a1a", textAlign: "center", fontWeight: 700 }}>UWaterloo Course Openings</h1>
        <p style={{ color: "#333", marginBottom: 40, textAlign: "center", fontSize: 16 }}>
          Get notified when a spot in a course opens up
        </p>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              placeholder="Phone e.g. (647) 123-4567"
              value={phoneDisplay}
              disabled={!phoneEnabled}
              onChange={e => {
                if (!phoneEnabled) return
                const digits = e.target.value.replace(/\D/g, "").slice(0, 10)
                const prevDigits = phone.replace("+1", "")
                const isDeleting = digits.length < prevDigits.length ||
                  (digits.length === prevDigits.length && e.target.value.length < phoneDisplay.length)
                let formatted = ""
                if (digits.length === 0) formatted = ""
                else if (digits.length < 3) formatted = `(${digits}`
                else if (digits.length === 3) formatted = isDeleting ? `(${digits}` : `(${digits}) `
                else if (digits.length < 6) formatted = `(${digits.slice(0,3)}) ${digits.slice(3)}`
                else if (digits.length === 6) formatted = isDeleting ? `(${digits.slice(0,3)}) ${digits.slice(3)}` : `(${digits.slice(0,3)}) ${digits.slice(3)}-`
                else formatted = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
                setPhoneDisplay(formatted)
                setPhone("+1" + digits)
              }}
              style={{
                flex: 1, padding: "10px 14px", fontSize: 15,
                border: "1px solid #c8a800", borderRadius: 0,
                background: phoneEnabled ? "#FFF8DC" : "#e8d870",
                color: phoneEnabled ? "#333" : "#aaa",
                fontFamily: "Didact Gothic", outline: "none"
              }}
            />
            <Toggle enabled={phoneEnabled} onToggle={togglePhone} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              placeholder="Email address"
              value={email}
              disabled={!emailEnabled}
              onChange={e => emailEnabled && setEmail(e.target.value)}
              type="email"
              style={{
                flex: 1, padding: "10px 14px", fontSize: 15,
                border: "1px solid #c8a800", borderRadius: 0,
                background: emailEnabled ? "#FFF8DC" : "#e8d870",
                color: emailEnabled ? "#333" : "#aaa",
                fontFamily: "Didact Gothic", outline: "none"
              }}
            />
            <Toggle enabled={emailEnabled} onToggle={toggleEmail} />
          </div>

          <div ref={containerRef} style={{ position: "relative" }}>
            <input
              placeholder="Search by subject e.g. CS, MATH"
              value={subject}
              onChange={handleSubjectChange}
              onFocus={() => courses.length > 0 && setShowDropdown(true)}
              style={{
                width: "100%", padding: "10px 14px", fontSize: 15,
                border: "1px solid #c8a800", borderRadius: 0,
                background: "#FFF8DC", color: "#333",
                fontFamily: "Didact Gothic", outline: "none",
                boxSizing: "border-box"
              }}
            />
            {searching && (
              <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#aaa", fontSize: 13 }}>
                Searching...
              </div>
            )}
            {showDropdown && courses.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0,
                background: "#FFF8DC", border: "1px solid #c8a800", borderTop: "none",
                borderRadius: "0 0 6px 6px", maxHeight: 240, overflowY: "auto",
                zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
              }}>
                {courses.map(c => (
                  <div
                    key={c.code}
                    onClick={() => selectCourse(c)}
                    style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, borderBottom: "1px solid #e8d080", display: "flex", gap: 10 }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F5E88A"}
                    onMouseLeave={e => e.currentTarget.style.background = "#FFF8DC"}
                  >
                    <span style={{ fontWeight: 600, minWidth: 70, color: "#1a1a1a" }}>{c.code}</span>
                    <span style={{ color: "#666" }}>{c.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedCourse && (
            <div style={{ padding: "10px 14px", background: "#FFF8DC", border: "1px solid #c8a800", borderRadius: 0, fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#333" }}>✓ {selectedCourse.code} — {selectedCourse.title}</span>
              <button onClick={() => { setSelectedCourse(null); setSubject(""); setCourses([]) }} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 18 }}>✕</button>
            </div>
          )}

          <select
            value={term}
            onChange={e => setTerm(e.target.value)}
            style={{ padding: "10px 14px", fontSize: 15, border: "1px solid #c8a800", borderRadius: 0, background: "#FFF8DC", color: "#333", fontFamily: "Didact Gothic" }}
          >
            <option value="1265">Spring 2026</option>
            <option value="1269">Fall 2026</option>
          </select>

          <button
            onClick={addWatch}
            disabled={loading || !selectedCourse}
            style={{
              padding: "12px 0", fontSize: 16,
              background: loading || !selectedCourse ? "#c8a800" : "#1a1a1a",
              color: "#FFF8DC", border: "none", borderRadius: 0,
              cursor: loading || !selectedCourse ? "not-allowed" : "pointer",
              fontWeight: 600, fontFamily: "Didact Gothic"
            }}
          >
            {loading ? "Adding..." : "Track this course"}
          </button>

          {status && (
            <p style={{ margin: 0, color: status.startsWith("✓") ? "#4a3800" : "#8b0000", fontWeight: 600, fontSize: 14 }}>
              {status}
            </p>
          )}
        </div>

        {/* Currently watching */}
        <div style={{ marginTop: 40 }}>
          <h3 style={{ margin: "0 0 16px 0", color: "#1a1a1a", fontSize: 16, fontWeight: 700 }}>Currently watching</h3>
          {stopStatus && (
            <p style={{ fontSize: 13, color: stopStatus.startsWith("✓") ? "#4a3800" : "#8b0000", margin: "0 0 12px 0", fontWeight: 600 }}>
              {stopStatus}
            </p>
          )}
          {watching.length === 0 ? (
            <p style={{ margin: 0, color: "#7a5c00", fontSize: 14 }}>No courses being watched yet.</p>
          ) : (
            watching.map((c, i) => (
              <div key={i} style={{
                padding: "10px 0", fontSize: 14, display: "flex", justifyContent: "space-between",
                alignItems: "center", color: "#333",
                borderBottom: i < watching.length - 1 ? "1px solid #c8a800" : "none"
              }}>
                <span>{c.course_code} ({{"1259": "Fall 2025", "1261": "Winter 2026", "1265": "Spring 2026", "1269": "Fall 2026"}[c.term] || c.term})</span>
                <button
                  onClick={() => stopWatch(c.course_code, c.term)}
                  style={{ padding: "4px 12px", background: "#1a1a1a", border: "none", borderRadius: 0, cursor: "pointer", color: "#FFF8DC", fontSize: 12 }}
                >
                  Stop
                </button>
              </div>
            ))
          )}
        </div>

        <p style={{ marginTop: 40, fontSize: 12, color: "#555" }}>
          <strong>To stop texts:</strong> reply <strong>STOP</strong> to the number that texted you.
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "#555" }}>
          Checks every 60 seconds between 8am–8pm.
        </p>
      </div>
    </div>
  )
}