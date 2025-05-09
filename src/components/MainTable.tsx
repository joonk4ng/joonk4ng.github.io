import React, { useEffect, useState } from 'react';
import { defaultData } from '../data/defaultData';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import './MainTable.css';
import { fillCTRPDF } from '../utils/fillCTRPDF';

const STORAGE_KEY = 'ctr-table-data';

function saveData(data: any) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return defaultData;
    }
  }
  return defaultData;
}

function toCSV(data: any[]) {
  if (!data.length) return '';
  const dayCount = data[0].days.length;
  const headers = ['Remark Number', 'Name', 'Classification'];
  for (let i = 0; i < dayCount; i++) {
    headers.push(`Date${i+1}`, `On${i+1}`, `Off${i+1}`);
  }
  const rows = data.map(row => [
    row.remarkNumber || '',
    row.name,
    row.classification,
    ...row.days.flatMap((d: any) => [d.date, d.on, d.off])
  ]);
  return [headers, ...rows].map(r => r.join(',')).join('\n');
}

export default function MainTable() {
  const [data, setData] = useState<any[]>(loadData());
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [dayCount, setDayCount] = useState(data[0]?.days.length || 2);
  const [days, setDays] = useState(data[0]?.days.map((d: any) => d.date) || ['2024-06-01', '2024-06-02']);
  const [newRow, setNewRow] = useState<{ remarkNumber?: string; name: string; classification: string; days: any[] }>(
    {
      remarkNumber: '',
      name: '',
      classification: '',
      days: days.map(date => ({ date, on: '', off: '' }))
    }
  );
  const [showSaveDefault, setShowSaveDefault] = useState(false);
  const [crewInfo, setCrewInfo] = useState({
    crewName: '',
    crewNumber: '',
    fireName: '',
    fireNumber: ''
  });

  useEffect(() => {
    saveData(data);
  }, [data]);

  // Add new entry
  const handleNewChange = (e: React.ChangeEvent<HTMLInputElement>, dayIdx?: number) => {
    const { name, value } = e.target;
    if (dayIdx !== undefined) {
      const daysArr = newRow.days.map((d: any, i: number) =>
        i === dayIdx ? { ...d, [name]: value } : d
      );
      setNewRow({ ...newRow, days: daysArr });
    } else {
      setNewRow({ ...newRow, [name]: value });
    }
  };
  const handleAddRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRow.name.trim() || !newRow.classification.trim() || !newRow.days[0].on || !newRow.days[0].off) return;
    setData([...data, newRow]);
    setNewRow({
      remarkNumber: '',
      name: '',
      classification: '',
      days: days.map(date => ({ date, on: '', off: '' }))
    });
    setShowAdd(false);
  };

  // Add/remove days (dates)
  const handleAddDay = () => {
    const newDate = prompt('Enter new date (YYYY-MM-DD):', '');
    if (!newDate) return;
    setDays(prev => [...prev, newDate]);
    setDayCount(dayCount + 1);
    setData(data => data.map(row => ({
      ...row,
      days: [...row.days, { date: newDate, on: '', off: '' }]
    })));
    setNewRow(row => ({
      ...row,
      days: [...row.days, { date: newDate, on: '', off: '' }]
    }));
  };
  const handleRemoveDay = (idx: number) => {
    setDays(prev => prev.filter((_, i) => i !== idx));
    setDayCount(dayCount - 1);
    setData(data => data.map(row => ({
      ...row,
      days: row.days.filter((_: any, i: number) => i !== idx)
    })));
    setNewRow(row => ({
      ...row,
      days: row.days.filter((_: any, i: number) => i !== idx)
    }));
  };

  // Edit row
  const handleEdit = (idx: number) => {
    setEditIdx(idx);
    setEditRow({ ...data[idx], days: (data[idx].days as any[]).map((d: any) => ({ ...d })) });
  };
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>, dayIdx?: number) => {
    const { name, value } = e.target;
    if (dayIdx !== undefined) {
      const daysArr = editRow.days.map((d: any, i: number) =>
        i === dayIdx ? { ...d, [name]: value } : d
      );
      setEditRow({ ...editRow, days: daysArr });
    } else {
      setEditRow({ ...editRow, [name]: value });
    }
  };
  const handleEditSave = () => {
    const newData = data.map((row: any, i: number) => (i === editIdx ? editRow : row));
    setData(newData);
    setEditIdx(null);
    setEditRow(null);
  };
  const handleEditCancel = () => {
    setEditIdx(null);
    setEditRow(null);
  };

  // Drag and drop
  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const items = Array.from(data);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    setData(items);
  };

  // CSV upload
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const rows = text.split(/\r?\n/).filter(Boolean);
      const [header, ...lines] = rows;
      const headers = header.split(',');
      const newData = lines.map(line => {
        const values = line.split(',');
        const daysArr: any[] = [];
        for (let i = 3; i < values.length; i += 3) {
          daysArr.push({ date: values[i], on: values[i + 1], off: values[i + 2] });
        }
        return {
          remarkNumber: values[0],
          name: values[1],
          classification: values[2],
          days: daysArr
        };
      });
      setData(newData);
      setDays(newData[0]?.days.map((d: any) => d.date) || []);
      setDayCount(newData[0]?.days.length || 2);
      setNewRow({
        remarkNumber: '',
        name: '',
        classification: '',
        days: newData[0]?.days.map((d: any) => ({ date: d.date, on: '', off: '' })) || []
      });
      setShowSaveDefault(true);
    };
    reader.readAsText(file);
  };

  const handleSaveDefault = () => {
    saveData(data);
    setShowSaveDefault(false);
    alert('Current table saved as default!');
  };

  // CSV export
  const handleExportCSV = () => {
    const csv = toCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crew_time_report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (idx: number) => {
    const newData = data.filter((_: any, i: number) => i !== idx);
    setData(newData);
  };

  const handleHeaderDateChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const newDate = e.target.value;
    setDays(prev => prev.map((d, i) => (i === idx ? newDate : d)));
    setData(data => data.map(row => ({
      ...row,
      days: row.days.map((day: any, i: number) => i === idx ? { ...day, date: newDate } : day)
    })));
    setNewRow(row => ({
      ...row,
      days: row.days.map((day: any, i: number) => i === idx ? { ...day, date: newDate } : day)
    }));
  };

  const handleResetToDefault = () => {
    setData(defaultData);
    saveData(defaultData);
    setShowSaveDefault(false);
    alert('Restored to original default data!');
  };

  return (
    <div className="ctr-container">
      <h2 className="ctr-title">Crew Time Report Table</h2>
      <div className="ctr-crew-info-form" style={{ marginBottom: 16 }}>
        <input
          className="ctr-input"
          placeholder="Crew Name"
          value={crewInfo.crewName}
          onChange={e => setCrewInfo({ ...crewInfo, crewName: e.target.value })}
          style={{ marginRight: 8 }}
        />
        <input
          className="ctr-input"
          placeholder="Crew Number"
          value={crewInfo.crewNumber}
          onChange={e => setCrewInfo({ ...crewInfo, crewNumber: e.target.value })}
          style={{ marginRight: 8 }}
        />
        <input
          className="ctr-input"
          placeholder="Fire Name"
          value={crewInfo.fireName}
          onChange={e => setCrewInfo({ ...crewInfo, fireName: e.target.value })}
          style={{ marginRight: 8 }}
        />
        <input
          className="ctr-input"
          placeholder="Fire Number"
          value={crewInfo.fireNumber}
          onChange={e => setCrewInfo({ ...crewInfo, fireNumber: e.target.value })}
        />
      </div>
      <div className="ctr-actions">
        <input type="file" accept=".csv" onChange={handleCSVUpload} />
        <button className="ctr-btn" onClick={handleExportCSV}>Export CSV</button>
        <button className="ctr-btn" onClick={() => fillCTRPDF(data, crewInfo)}>Export to PDF</button>
        {showSaveDefault && (
          <button className="ctr-btn" onClick={handleSaveDefault} style={{ background: '#388e3c' }}>Save as Default</button>
        )}
        <button className="ctr-btn" onClick={handleResetToDefault} style={{ background: '#888' }}>Reset to Default</button>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="table">
          {(provided) => (
            <table ref={provided.innerRef} {...provided.droppableProps} className="ctr-table">
              <thead>
                <tr>
                  <th className="ctr-th" rowSpan={2}>REMARK NUMBER</th>
                  <th className="ctr-th name" rowSpan={2}>NAME OF EMPLOYEE</th>
                  <th className="ctr-th" rowSpan={2}>CLASSIFICATION</th>
                  {days.map((date, i) => (
                    <th className="ctr-th date" colSpan={2} key={i} style={{ textAlign: 'center' }}>
                      DATE<br />
                      <input
                        className="ctr-input ctr-date"
                        type="date"
                        value={date}
                        onChange={e => handleHeaderDateChange(e, i)}
                        style={{ fontWeight: 'bold', fontSize: 14, textAlign: 'center', background: 'transparent', border: 'none', borderBottom: '1.5px solid #d32f2f', width: 110 }}
                      />
                    </th>
                  ))}
                </tr>
                <tr>
                  {days.map((_, i) => (
                    <React.Fragment key={i}>
                      <th className="ctr-th" colSpan={2}>Military Time</th>
                    </React.Fragment>
                  ))}
                </tr>
                <tr>
                  <th className="ctr-th"></th>
                  <th className="ctr-th"></th>
                  <th className="ctr-th"></th>
                  {days.map((_, i) => (
                    <React.Fragment key={i}>
                      <th className="ctr-th">ON</th>
                      <th className="ctr-th">OFF</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row: any, idx: number) => (
                  <Draggable key={idx} draggableId={String(idx)} index={idx}>
                    {(provided) => (
                      <tr ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="ctr-tr">
                        <td className="ctr-td">
                          {editIdx === idx ? (
                            <input className="ctr-input" value={editRow.remarkNumber || ''} name="remarkNumber" onChange={e => handleEditChange(e)} />
                          ) : (
                            row.remarkNumber || ''
                          )}
                        </td>
                        <td className="ctr-td">
                          {editIdx === idx ? (
                            <input className="ctr-input" value={editRow.name} name="name" onChange={e => handleEditChange(e)} />
                          ) : (
                            row.name
                          )}
                        </td>
                        <td className="ctr-td">
                          {editIdx === idx ? (
                            <input className="ctr-input" value={editRow.classification} name="classification" onChange={e => handleEditChange(e)} />
                          ) : (
                            row.classification
                          )}
                        </td>
                        {row.days.map((day: any, dayIdx: number) => (
                          <React.Fragment key={dayIdx}>
                            <td className="ctr-td">
                              {editIdx === idx ? (
                                <input className="ctr-input ctr-on" value={editRow.days[dayIdx].on} name="on" onChange={e => handleEditChange(e, dayIdx)} />
                              ) : (
                                day.on
                              )}
                            </td>
                            <td className="ctr-td">
                              {editIdx === idx ? (
                                <input className="ctr-input ctr-off" value={editRow.days[dayIdx].off} name="off" onChange={e => handleEditChange(e, dayIdx)} />
                              ) : (
                                day.off
                              )}
                            </td>
                          </React.Fragment>
                        ))}
                        <td className="ctr-td">
                          {editIdx === idx ? (
                            <>
                              <button className="ctr-btn" onClick={handleEditSave}>Save</button>
                              <button className="ctr-btn" onClick={handleEditCancel}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button className="ctr-btn" onClick={() => handleEdit(idx)}>Edit</button>
                              <button className="ctr-btn" style={{ background: '#d32f2f' }} onClick={() => handleDelete(idx)}>Delete</button>
                            </>
                          )}
                        </td>
                      </tr>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </tbody>
            </table>
          )}
        </Droppable>
      </DragDropContext>
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        {showAdd ? (
          <form className="ctr-form" onSubmit={handleAddRow} style={{ justifyContent: 'center' }}>
            <input className="ctr-input" placeholder="Remark Number (optional)" value={newRow.remarkNumber || ''} name="remarkNumber" onChange={e => handleNewChange(e)} />
            <input className="ctr-input" placeholder="Name" value={newRow.name} name="name" onChange={e => handleNewChange(e)} required />
            <input className="ctr-input" placeholder="Classification" value={newRow.classification} name="classification" onChange={e => handleNewChange(e)} required />
            {days.map((date, i) => (
              <span key={i} className="ctr-day-fields">
                <input className="ctr-input ctr-on" placeholder="On" value={newRow.days[i].on} name="on" onChange={e => handleNewChange(e, i)} required={i === 0} />
                <input className="ctr-input ctr-off" placeholder="Off" value={newRow.days[i].off} name="off" onChange={e => handleNewChange(e, i)} required={i === 0} />
              </span>
            ))}
            <button className="ctr-btn" type="submit">Add</button>
            <button className="ctr-btn" type="button" onClick={() => setShowAdd(false)}>Cancel</button>
          </form>
        ) : (
          <button className="ctr-btn" onClick={() => setShowAdd(true)}>+ Add Entry</button>
        )}
      </div>
    </div>
  );
} 