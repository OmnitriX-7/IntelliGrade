import React, { useState } from 'react';
import { styles } from './TeacherDashboardStyles';

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState('setup');
  
  // Setup State
  const [setupData, setSetupData] = useState({ id: '', exam_name: '' });
  const [questionPaper, setQuestionPaper] = useState(null);
  const [answerKey, setAnswerKey] = useState(null);
  const [setupMessage, setSetupMessage] = useState({ text: '', type: '' });
  const [isSettingUp, setIsSettingUp] = useState(false);

  // Grading State
  const [files, setFiles] = useState([]);
  const [gradingExamId, setGradingExamId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [results, setResults] = useState([]);

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    if (!questionPaper || !answerKey || !setupData.id || !setupData.exam_name) {
      setSetupMessage({ text: "Please fill all fields and upload both files.", type: "error" });
      return;
    }

    setIsSettingUp(true);
    setSetupMessage({ text: "AI is analyzing the documents and generating the grading rubric...", type: "info" });

    const formData = new FormData();
    formData.append("exam_id", setupData.id);
    formData.append("exam_name", setupData.exam_name);
    formData.append("question_paper", questionPaper);
    formData.append("answer_key", answerKey);

    try {
      const response = await fetch("http://localhost:8000/setup-exam", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Server error during setup.");
      
      setSetupMessage({ text: "Exam securely created!", type: "success" });
      setSetupData({ id: '', exam_name: '' });
      setQuestionPaper(null);
      setAnswerKey(null);
    } catch (error) {
      setSetupMessage({ text: "Failed to setup exam. Check your connection.", type: "error" });
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleBulkUpload = async () => {
    if (files.length === 0 || !gradingExamId) {
      setMessage({ text: "Please enter an Exam ID and select files.", type: "error" });
      return;
    }

    setIsUploading(true);
    setMessage({ text: `Grading ${files.length} papers...`, type: "info" });
    
    const processedResults = [];

    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append("exam_id", gradingExamId); 
      formData.append("file", files[i]);

      try {
        const response = await fetch("http://localhost:8000/upload-and-grade", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || "Server issue");
        }
        
        const data = await response.json();
        
        processedResults.push({
          id: Date.now() + i,
          filename: files[i].name,
          status: data.review_status,
        });
      } catch (error) {
        processedResults.push({ id: Date.now() + i, filename: files[i].name, status: "error" });
      }
    }

    setResults([...processedResults, ...results]);
    setMessage({ text: `Finished processing!`, type: "success" });
    setFiles([]);
    setIsUploading(false);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Teacher Dashboard</h2>
      
      <div style={styles.tabContainer}>
        <button onClick={() => setActiveTab('setup')} style={styles.tab(activeTab === 'setup')}>
          1. Setup Exam
        </button>
        <button onClick={() => setActiveTab('grade')} style={styles.tab(activeTab === 'grade')}>
          2. Grade Submissions
        </button>
      </div>

      {activeTab === 'setup' && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Create New Exam</h3>
          <form onSubmit={handleSetupSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Exam ID</label>
              <input type="text" placeholder="e.g., oop-midterm" value={setupData.id} onChange={(e) => setSetupData({...setupData, id: e.target.value})} style={styles.input} required />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Exam Name</label>
              <input type="text" placeholder="e.g., OOP Midterm 2026" value={setupData.exam_name} onChange={(e) => setSetupData({...setupData, exam_name: e.target.value})} style={styles.input} required />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Blank Question Paper</label>
              <input type="file" accept="image/*" onChange={(e) => setQuestionPaper(e.target.files[0])} style={{...styles.input, padding: '8px'}} required />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Official Answer Key</label>
              <input type="file" accept="image/*" onChange={(e) => setAnswerKey(e.target.files[0])} style={{...styles.input, padding: '8px'}} required />
            </div>

            <button type="submit" disabled={isSettingUp} style={styles.primaryBtn(isSettingUp)}>
              {isSettingUp ? 'Generating Master Rubric...' : 'Create Exam & Generate Rubric'}
            </button>
          </form>
          
          {setupMessage.text && (
            <div style={styles.message(setupMessage.type)}>
              {setupMessage.type === 'success' ? '✅ ' : setupMessage.type === 'error' ? '❌ ' : '⏳ '} 
              {setupMessage.text}
            </div>
          )}
        </div>
      )}

      {activeTab === 'grade' && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Grade Student Papers</h3>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Target Exam ID</label>
            <input type="text" placeholder="e.g., oop-midterm" value={gradingExamId} onChange={(e) => setGradingExamId(e.target.value)} style={styles.input} />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Upload Submissions</label>
            <div style={styles.fileZone}>
              <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => setFiles(Array.from(e.target.files))} style={{ width: '100%', cursor: 'pointer' }} />
              <p style={{ color: '#64748b', marginTop: '12px', fontSize: '14px' }}>
                {files.length > 0 ? <strong style={{color: '#4f46e5'}}>{files.length} files selected for grading.</strong> : "Click to browse or drag PDF/Image answer sheets here."}
              </p>
            </div>
          </div>

          <button onClick={handleBulkUpload} disabled={isUploading} style={styles.primaryBtn(isUploading)}>
            {isUploading ? "AI Grading in Progress..." : "Initiate AI Grading"}
          </button>

          {message.text && (
            <div style={styles.message(message.type)}>
              {message.type === 'success' ? '✅ ' : message.type === 'error' ? '❌ ' : '⚙️ '} 
              {message.text}
            </div>
          )}

          {results.length > 0 && (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Filename</th>
                  <th style={styles.th}>Evaluation Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id}>
                    <td style={styles.td}>
                      <span style={{ fontWeight: '500' }}>{result.filename}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.badge(result.status)}>
                        {result.status === 'unregistered_needs_review' ? '⚠️ Needs ID Review' 
                        : result.status === 'error' ? '❌ Failed' 
                        : '✅ Graded & Recorded'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}