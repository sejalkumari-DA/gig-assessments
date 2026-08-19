-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Candidates Table
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  location VARCHAR(255),
  experience VARCHAR(255),
  company VARCHAR(255),
  qualification VARCHAR(255),
  skills TEXT,
  linkedin VARCHAR(255),
  portfolio VARCHAR(255),
  expected_salary VARCHAR(255),
  notice_period VARCHAR(255),
  resume_url TEXT,
  video_url TEXT,
  transcript TEXT,
  english_transcript TEXT,
  interview_language VARCHAR(50) DEFAULT 'en-US',
  communication_score INT,
  confidence_score INT,
  technical_score INT,
  grammar_score INT,
  fluency_score INT,
  professionalism_score INT,
  overall_score DECIMAL(4,2),
  summary TEXT,
  strengths TEXT[],
  weaknesses TEXT[],
  recommendation TEXT,
  status VARCHAR(50) DEFAULT 'Pending Video',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: Storage buckets "resumes" and "videos" need to be created manually in the Supabase Dashboard.
