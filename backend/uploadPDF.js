import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const DEFAULT_PDF_FOLDER = path.join("backend", "PDFs");
const INPUT_PATH = path.join("backend", "input.json");
const OUTPUT_PATH = path.join("backend", "output.json");

// Ensure folder exists
if (!fs.existsSync(DEFAULT_PDF_FOLDER)) {
  fs.mkdirSync(DEFAULT_PDF_FOLDER, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DEFAULT_PDF_FOLDER);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

const app = express();
app.use(express.json());

app.post("/upload", upload.array("pdfs", 20), async (req, res) => {
  try {
    const { persona, job_to_be_done } = req.body;

    if (!persona || !job_to_be_done) {
      return res.status(400).json({ error: "Persona and job_to_be_done are required" });
    }

    // Build dynamic JSON input for Python
    const documents = req.files.map(file => ({
      filename: file.filename,
      title: path.parse(file.originalname).name
    }));

    const inputJson = {
      challenge_info: {
        challenge_id: "round_1b_dynamic",
        test_case_name: "dynamic_pdf_processing",
        description: "Dynamic PDF upload and metadata"
      },
      documents,
      persona: { role: persona },
      job_to_be_done: { task: job_to_be_done }
    };

    // Create input.json only if it doesn't exist
    if (!fs.existsSync(INPUT_PATH)) {
      fs.writeFileSync(INPUT_PATH, JSON.stringify(inputJson, null, 2));
      console.log(`✅ Created input.json`);
    } else {
      console.log(`⚠️ input.json already exists — skipping creation`);
    }

    // Call Python script
    const pythonProcess = spawn("python3", ["main.py"]);

    pythonProcess.stdout.on("data", data => {
      console.log(`Python output: ${data}`);
    });

    pythonProcess.stderr.on("data", data => {
      console.error(`Python error: ${data}`);
    });

    pythonProcess.on("close", code => {
      console.log(`Python process exited with code ${code}`);

      // After Python finishes, read output.json and send to frontend
      if (fs.existsSync(OUTPUT_PATH)) {
        const outputData = fs.readFileSync(OUTPUT_PATH, "utf8");
        try {
          res.json(JSON.parse(outputData));
        } catch (err) {
          console.error("Error parsing output.json:", err);
          res.status(500).json({ error: "Invalid output.json format" });
        }
      } else {
        res.status(500).json({ error: "output.json not found" });
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to upload PDFs" });
  }
});

app.listen(5000, () => console.log("🚀 Server running on port 5000"));
