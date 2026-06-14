import React, { useState } from 'react';

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState('setup');
  
  const [setupData, setSetupData] = useState({ id: '', exam_name: '' });
  const [questionPaper, setQuestionPaper] = useState(null);
  const [answerKey, setAnswerKey] = useState(null);
  const [setupMessage, setSetupMessage] = useState({ text: '', type: '' });
  const [isSettingUp, setIsSettingUp] = useState(false);

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
      
      setSetupMessage({ text: "Exam securely created! You can now switch to the Grading tab.", type: "success" });
      setSetupData({ id: '', exam_name: '' });
      setQuestionPaper(null);
      setAnswerKey(null);
    } catch (error) {
      setSetupMessage({ text: "Failed to setup exam. Check connection.", type: "error" });
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
        alert(`Error evaluating ${files[i].name}:\n${error.message}`);
        processedResults.push({ id: Date.now() + i, filename: files[i].name, status: "error" });
      }
    }

    setResults([...processedResults, ...results]);
    setMessage({ text: `Finished processing!`, type: "success" });
    setFiles([]);
    setIsUploading(false);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>Teacher Dashboard</h2>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        <button 
          onClick={() => setActiveTab('setup')}
          style={{ padding: '10px 20px', border: 'none', background: activeTab === 'setup' ? '#007BFF' : '#f0f0f0', color: activeTab === 'setup' ? '#fff' : '#333', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          1. Setup Exam
        </button>
        <button 
          onClick={() => setActiveTab('grade')}
          style={{ padding: '10px 20px', border: 'none', background: activeTab === 'grade' ? '#28a745' : '#f0f0f0', color: activeTab === 'grade' ? '#fff' : '#333', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          2. Grade Student Papers
        </button>
      </div>

      {activeTab === 'setup' && (
        <div style={{ backgroundColor: '#fafafa', padding: '30px', borderRadius: '8px', border: '1px solid #ddd' }}>
          <h3>Create New Exam</h3>
          <form onSubmit={handleSetupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="text" placeholder="Exam ID (e.g., oop-midterm)" value={setupData.id} onChange={(e) => setSetupData({...setupData, id: e.target.value})} style={{ padding: '10px' }} required />
            <input type="text" placeholder="Exam Name (e.g., OOP Midterm 2026)" value={setupData.exam_name} onChange={(e) => setSetupData({...setupData, exam_name: e.target.value})} style={{ padding: '10px' }} required />
            
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Upload Blank Question Paper</label>
              <input type="file" accept="image/*" onChange={(e) => setQuestionPaper(e.target.files[0])} required />
            </div>
            
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Upload Official Answer Key</label>
              <input type="file" accept="image/*" onChange={(e) => setAnswerKey(e.target.files[0])} required />
            </div>

            <button type="submit" disabled={isSettingUp} style={{ padding: '12px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>
              {isSettingUp ? 'Generating Master Rubric...' : 'Create Exam'}
            </button>
          </form>
          
          {setupMessage.text && (
            <div style={{ marginTop: '20px', padding: '10px', backgroundColor: setupMessage.type === 'error' ? '#f8d7da' : setupMessage.type === 'success' ? '#d4edda' : '#e2e3e5', color: setupMessage.type === 'error' ? '#721c24' : '#155724', borderRadius: '5px' }}>
              {setupMessage.text}
            </div>
          )}
        </div>
      )}

      {activeTab === 'grade' && (
        <div>
          <h3>Grade Student Papers</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Target Exam ID</label>
            <input 
              type="text" 
              placeholder="e.g., oop-midterm" 
              value={gradingExamId} 
              onChange={(e) => setGradingExamId(e.target.value)} 
              style={{ padding: '10px', width: '100%', marginBottom: '10px' }} 
            />
          </div>

          <div style={{ border: '2px dashed #ccc', borderRadius: '8px', padding: '40px', textAlign: 'center', backgroundColor: '#fafafa', marginBottom: '20px' }}>
            <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => setFiles(Array.from(e.target.files))} style={{ marginBottom: '20px' }} />
            <p style={{ color: '#666' }}>{files.length > 0 ? `${files.length} files selected.` : "Select student answer sheets (Images or PDFs)."}</p>
          </div>

          <button onClick={handleBulkUpload} disabled={isUploading} style={{ padding: '15px 30px', backgroundColor: isUploading ? '#ccc' : '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', width: '100%' }}>
            {isUploading ? "Grading in Progress..." : "Initiate AI Grading"}
          </button>

          {message.text && (
            <div style={{ marginTop: '20px', padding: '15px', borderRadius: '5px', backgroundColor: message.type === 'error' ? '#f8d7da' : '#d4edda', color: '#155724', textAlign: 'center' }}>
              {message.text}
            </div>
          )}

          {results.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '30px' }}>
              <thead><tr style={{ backgroundColor: '#f4f4f4', borderBottom: '2px solid #ddd' }}><th style={{ padding: '12px' }}>Filename</th><th style={{ padding: '12px' }}>Status</th></tr></thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{result.filename}</td>
                    <td style={{ padding: '12px' }}>
                      {result.status === 'unregistered_needs_review' ? (
                        <span style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '6px', fontWeight: 'bold' }}>⚠️ Student isn't registered. Needs review</span>
                      ) : result.status === 'error' ? (
                        <span style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '6px', fontWeight: 'bold' }}>❌ ERROR</span>
                      ) : (
                        <span style={{ backgroundColor: '#d4edda', color: '#155724', padding: '6px', fontWeight: 'bold' }}>✅ GRADED</span>
                      )}
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