const payload = { prompt: "I want to visit Tokyo for 3 days." };
fetch("http://localhost:3000/api/plan-trip", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
}).then(res => res.json()).then(data => {
  console.log(JSON.stringify(data, null, 2));
}).catch(err => console.error(err));
