import express from "express";

const app = express();
const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("CustomerPull Gateway is running!");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

