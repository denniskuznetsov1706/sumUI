/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useRef } from "react";
import "./Home.css";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

function Home() {
    const suggestionsFromAnomalies = (anomalyList) => {
        const suggestions = [];
        if (anomalyList.includes("no_current")) {
            suggestions.push("Check for disconnected meters or power outages.");
        }
        if (anomalyList.includes("voltage_out_of_range")) {
            suggestions.push("Investigate unstable voltage — possible grid issue.");
        }
        if (anomalyList.includes("frequency_anomaly")) {
            suggestions.push("Frequency fluctuation detected — monitor grid health.");
        }
        if (anomalyList.includes("low_power_factor")) {
            suggestions.push("Low power factor — install capacitor banks to improve efficiency.");
        }
        if (anomalyList.includes("neutral_current_abnormal")) {
            suggestions.push("High neutral current — check for wiring issues or imbalance.");
        }
        if (anomalyList.includes("spike_apparent_md")) {
            suggestions.push("Spiked apparent power — investigate unauthorized load.");
        }
        if (anomalyList.includes("no_energy_consumption")) {
            suggestions.push("No change in energy — verify if meter is disconnected or idle.");
        }
        if (anomalyList.includes("low_balance")) {
            suggestions.push("Low prepaid balance — notify user to recharge.");
        }
        return suggestions;
    };
    const [chartData, setChartData] = useState([]);
    const [chatHistory, setChatHistory] = useState([]);
    const [inputMessage, setInputMessage] = useState("");
    const [suggestionHistory, setSuggestionHistory] = useState([]);
    const [autoInsights, setAutoInsights] = useState([]);
    const [loading, setLoading] = useState(false);

    const chatEndRef = useRef(null);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatHistory]);

    const currentContext = chartData[chartData.length - 1] || {};
    const recentStats = chartData.slice(-30);

    useEffect(() => {
        fetch("http://localhost:5000/api/history")
            .then(res => res.json())
            .then(data => setChartData(data))
            .catch(err => console.error("History fetch failed", err));

        fetch("http://localhost:5000/api/auto-insights")
            .then(res => res.json())
            .then(data => setAutoInsights(data))
            .catch(err => console.error("Insights fetch failed", err));

        const interval = setInterval(() => {
            fetch("http://localhost:5000/api/live")
                .then(res => res.json())
                .then(newPoint => {
                    setChartData(prev => [...prev.slice(-99), newPoint]);
                    const newSuggestions = suggestionsFromAnomalies(newPoint.anomaly || []);
                    const timestamp = new Date().toLocaleString();
                    if (newSuggestions.length > 0) {
                        setSuggestionHistory(prev => [
                            { time: timestamp, suggestions: newSuggestions },
                            ...prev
                        ]);
                    }
                })
                .catch(err => console.error("Live fetch failed", err));
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    // Update askBot to send current stats

    const askBot = async ({ question, source = "manual", context = {} }) => {
        const payload = {
            question,
            source,
            context: {
                current: currentContext,
                recent_stats: recentStats
            }
        };
        try {
            setLoading(true);
            const res = await fetch("https://adyasmart.app.n8n.cloud/webhook/28cd80ba-0e23-4720-b2bc-adeb727bae4c", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            const reply = data.reply || "🤖 No reply received.";
            setChatHistory(prev => [...prev, { sender: "User", msg: question }, { sender: "Bot", msg: reply }]);
            setLoading(false);
        } catch (err) {
            setChatHistory(prev => [...prev, { sender: "Bot", msg: "❌ Failed to contact assistant." }]);
            setLoading(false);
        }
    };

    const handleSuggestionClick = (text) => {
        askBot({ question: text, source: "suggestion", context: currentContext });
        setTimeout(() => {
            const el = document.getElementById("chatbot-section");
            if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 200);
    };

    const handleManualSubmit = () => {
        if (inputMessage.trim()) {
            askBot({ question: inputMessage, source: "manual", context: currentContext });
            setInputMessage("");
        }
    };

    const simulateAnomaly = (type) => {
        fetch(`http://localhost:5000/api/live?anomaly=${type}`)
            .then(res => res.json())
            .then(newPoint => {
                setChartData(prev => [...prev.slice(-99), newPoint]);
                const newSuggestions = suggestionsFromAnomalies(newPoint.anomaly || []);
                const timestamp = new Date().toLocaleString();
                if (newSuggestions.length > 0) {
                    setSuggestionHistory(prev => [
                        { time: timestamp, suggestions: newSuggestions },
                        ...prev
                    ]);
                }
            })
            .catch(err => console.error("Simulation failed", err));
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Smart Utility Manager</h1>
                <div className="search-bar">
                    <input type="text" placeholder="Search" />
                    <button>🔍</button>
                </div>
            </header>

            <div className="filters">
                <select><option>Section name</option></select>
                <select><option>Subsection name</option></select>
                <select><option>Feeder name</option></select>
                <input type="date" />
                <button className="apply-btn">Apply filters</button>
            </div>

            <div className="auto-insights">
                <h2>📈 Auto Insights</h2>
                {autoInsights.length === 0 ? (
                    <p>No insights available.</p>
                ) : (
                    <ul>
                        {autoInsights.map((insight, index) => (
                            <li key={index}>• {insight}</li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="sim-buttons">
                <button onClick={() => simulateAnomaly("voltage_out_of_range")}>Sim Voltage</button>
                <button onClick={() => simulateAnomaly("no_current")}>Sim No Current</button>
                <button onClick={() => simulateAnomaly("frequency_anomaly")}>Sim Frequency</button>
                <button onClick={() => simulateAnomaly("low_power_factor")}>Sim Power Factor</button>
                <button onClick={() => simulateAnomaly("neutral_current_abnormal")}>Sim Neutral</button>
                <button onClick={() => simulateAnomaly("spike_apparent_md")}>Sim MD Spike</button>
                <button onClick={() => simulateAnomaly("no_energy_consumption")}>Sim No Energy</button>
                <button onClick={() => simulateAnomaly("low_balance")}>Sim Low Balance</button>
            </div>

            <div className="charts">
                {[
                    { label: "Voltage", key: "voltage", color: "#00d8ff" },
                    { label: "Frequency", key: "frequency", color: "#ff6f61" },
                    { label: "Current", key: "current", color: "#ffd700" },
                    { label: "Power Factor", key: "power_factor", color: "#32cd32" },
                    { label: "Neutral Current", key: "neutral_current", color: "#8a2be2" },
                    { label: "Apparent MD", key: "apparent_md", color: "#ff69b4" },
                    { label: "Balance", key: "balance", color: "#ffa500" },
                ].map(({ label, key, color }) => (
                    <div className="chart-box" key={key}>
                        <h3>{label}</h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey={key} stroke={color} strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ))}
            </div>
            <div className="kpi-panel">
                {[
                    { label: "Voltage", key: "voltage", unit: "V" },
                    { label: "Frequency", key: "frequency", unit: "Hz" },
                    { label: "Current", key: "current", unit: "A" },
                    { label: "Power Factor", key: "power_factor", unit: "" },
                    { label: "Neutral Current", key: "neutral_current", unit: "A" },
                    { label: "Apparent MD", key: "apparent_md", unit: "kVA" },
                    { label: "Balance", key: "balance", unit: "Rs" },
                ].map(({ label, key, unit }) => (
                    <div key={key} className="kpi-box">
                        <div className="kpi-title">{label}</div>
                        <div className="kpi-value">{currentContext[key] ?? "-"} {unit}</div>
                    </div>
                ))}
            </div>

            <div className="suggestion-history">
                <h2>📋 All Suggestions</h2>
                {suggestionHistory.length === 0 ? (
                    <p>No suggestions yet.</p>
                ) : (
                    suggestionHistory.map((entry, i) => (
                        <div className="suggestion-group" key={i}>
                            <div className="timestamp">{entry.time}</div>
                            <ul>
                                {entry.suggestions.map((s, j) => (
                                    <li key={j}>
                                        • {s}
                                        <button
                                            className="chat-suggestion-btn"
                                            style={{ marginLeft: "10px" }}
                                            onClick={() => handleSuggestionClick(s)}
                                        >
                                            💬 Chat with assistant
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))
                )}
            </div>

            <div className="chatbot-section" id="chatbot-section">
                <h2>🤖 Assistant</h2>
                <div className="chat-box">
                    {chatHistory.map((entry, index) => (
                        <div key={index} className={entry.sender === "User" ? "chat-user" : "chat-bot"}>
                            <strong>{entry.sender}:</strong> {entry.msg}
                        </div>
                    ))}
                    {loading && (
                        <div className="chat-bot">
                            <div className="spinner"></div>
                            Assistant is typing...
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                <div className="question-dropdown">
                    <select onChange={(e) => {
                        const question = e.target.value;
                        if (question) askBot({ question });
                    }}>
                        <option value="">💬 Ask a predefined question...</option>

                        <optgroup label="⚡ Voltage, Current, and Frequency">
                            <option value="How many voltage anomalies were detected this week?">How many voltage anomalies?</option>
                            <option value="Is the frequency stable over time?">Is the frequency stable?</option>
                            <option value="What was the maximum current recorded today?">Maximum current today?</option>
                            <option value="Has the voltage stayed within safe limits?">Voltage safe limits?</option>
                        </optgroup>

                        <optgroup label="🔌 Energy and Usage">
                            <option value="Is energy consumption increasing or decreasing?">Energy trend?</option>
                            <option value="What is the average energy consumption over the last 24 hours?">Avg energy (24h)?</option>
                            <option value="How does current usage compare to last week?">Compare to last week?</option>
                            <option value="Are there any unusual consumption patterns?">Unusual patterns?</option>
                        </optgroup>

                        <optgroup label="⚠️ Anomalies and Fault Detection">
                            <option value="What anomalies occurred in the last 24 hours?">Anomalies in 24h?</option>
                            <option value="Which parameter triggers the most anomalies?">Top anomaly triggers?</option>
                            <option value="Has there been any period of no current flow?">No current flow?</option>
                        </optgroup>

                        <optgroup label="📊 Power Factor and Efficiency">
                            <option value="Is the power factor acceptable?">Power factor OK?</option>
                            <option value="Should we consider installing a capacitor bank?">Capacitor bank?</option>
                        </optgroup>

                        <optgroup label="🧠 Predictive and Optimization">
                            <option value="What optimization suggestions do you have?">Optimization tips?</option>
                            <option value="When do anomalies usually happen during the day?">Anomaly timing?</option>
                            <option value="Can you detect patterns in anomalies?">Pattern detection?</option>
                        </optgroup>
                    </select>
                </div>

                <div className="chat-input">
                    <input
                        type="text"
                        placeholder="Ask something..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                    />
                    <button onClick={handleManualSubmit}>Send</button>
                </div>
            </div>
        </div>
    );
}

export default Home;
