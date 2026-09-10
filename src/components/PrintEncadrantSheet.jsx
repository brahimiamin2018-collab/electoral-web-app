import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';

export default function PrintEncadrantSheet({ encadrants, isOpen, onClose }) {
  const [selectedEncadrant, setSelectedEncadrant] = useState('');
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (encadrants && encadrants.length > 0 && !selectedEncadrant) {
      setSelectedEncadrant(encadrants[0].nom);
    }
  }, [encadrants]);

  useEffect(() => {
    if (selectedEncadrant) {
      fetchEncadrantVoters(selectedEncadrant);
    }
  }, [selectedEncadrant]);

  const fetchEncadrantVoters = async (encNom) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assignments?encadrant=${encodeURIComponent(encNom)}&limit=1000`);
      const data = await res.json();
      setVoters(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentEnc = encadrants.find(e => e.nom === selectedEncadrant) || { nom: selectedEncadrant, tel: '' };

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <>
      {/* On-Screen Modal Overlay (Hidden during print) */}
      <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:hidden">
        <div className="glass-panel max-w-4xl w-full rounded-2xl border border-slate-800 p-6 space-y-4 shadow-2xl my-4 max-h-[95vh] flex flex-col">
          
          {/* Top Control Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Impression Fiche Encadrant</h3>
                <p className="text-xs text-slate-400">Sélectionnez un encadrant pour afficher sa fiche d'affectation</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <select
                value={selectedEncadrant}
                onChange={(e) => setSelectedEncadrant(e.target.value)}
                className="px-3 py-2 glass-input rounded-xl text-xs bg-slate-900 text-slate-200"
              >
                {encadrants.map((e, idx) => (
                  <option key={idx} value={e.nom}>
                    {e.nom} {e.tel ? `(Tél: ${e.tel})` : ''} - ({e.count_affectations || 0} électeurs)
                  </option>
                ))}
              </select>

              <button
                onClick={handlePrint}
                disabled={voters.length === 0}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer</span>
              </button>

              <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* On-Screen Preview */}
          <div className="flex-1 overflow-y-auto bg-white text-slate-900 p-4 rounded-xl border border-slate-300">
            <div className="bg-slate-100 p-3 rounded-lg border border-slate-300 mb-3 grid grid-cols-3 gap-4 text-xs font-sans">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Encadrant Responsable:</span>
                <span className="font-extrabold text-sm text-slate-900">{currentEnc.nom}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Numéro de Téléphone:</span>
                <span className="font-extrabold text-sm text-slate-900">{currentEnc.tel || 'N/C'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Électeurs Affectés:</span>
                <span className="font-extrabold text-sm text-emerald-700">{voters.length} Électeurs</span>
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-500 text-sm">Chargement de la fiche d'affectation...</div>
            ) : voters.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">Aucun électeur affecté à cet encadrant.</div>
            ) : (
              <table className="w-full max-w-[95%] mx-auto text-left border-collapse text-xs border border-black">
                <thead>
                  <tr className="bg-white text-black font-bold uppercase text-[10px] tracking-wider border-b-2 border-black">
                    <th className="p-2 text-center w-8 border border-black">N°</th>
                    <th className="p-2 border border-black w-20">CIN</th>
                    <th className="p-2 border border-black w-36">Nom & Prénom</th>
                    <th className="p-2 border border-black w-28">Commune</th>
                    <th className="p-2 border border-black w-32">NBV</th>
                    <th className="p-2 text-center w-14 border border-black">REÇU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black border border-black">
                  {voters.map((item, idx) => (
                    <tr key={item.CIN || idx} className="bg-white border-b border-black">
                      <td className="p-2 text-center font-mono font-bold text-black border border-black">{idx + 1}</td>
                      <td className="p-2 font-mono font-bold text-black border border-black whitespace-nowrap">{item.CIN}</td>
                      <td className="p-2 font-bold text-black border border-black max-w-[130px] truncate">{item.PRENOM} {item.NOM}</td>
                      <td className="p-2 text-black border border-black max-w-[100px] truncate">{item.COMMUNE || 'N/C'}</td>
                      <td className="p-2 text-black border border-black max-w-[120px] truncate">{item.LIEU_BUREAU_VOTE || 'N/C'}</td>
                      <td className="p-2 text-center font-extrabold text-black border border-black">
                        {item.has_voted ? 'OK' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>

      {/* Standalone Printable Container Rendered Directly in Body */}
      <div id="printable-encadrant-sheet" className="hidden print:block bg-white text-slate-900">
        <div className="bg-slate-100 p-3 rounded-lg border border-slate-300 mb-3 grid grid-cols-3 gap-4 text-xs font-sans">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Encadrant Responsable:</span>
            <span className="font-extrabold text-sm text-slate-900">{currentEnc.nom}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Numéro de Téléphone:</span>
            <span className="font-extrabold text-sm text-slate-900">{currentEnc.tel || 'N/C'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Électeurs Affectés:</span>
            <span className="font-extrabold text-sm text-emerald-700">{voters.length} Électeurs</span>
          </div>
        </div>

        {voters.length > 0 && (
          <table className="w-full max-w-[95%] mx-auto text-left border-collapse text-xs border border-black">
            <thead>
              <tr className="bg-white text-black font-bold uppercase text-[10px] tracking-wider border-b-2 border-black">
                <th className="p-2 text-center w-8 border border-black">N°</th>
                <th className="p-2 border border-black w-20">CIN</th>
                <th className="p-2 border border-black w-36">Nom & Prénom</th>
                <th className="p-2 border border-black w-28">Commune</th>
                <th className="p-2 border border-black w-32">NBV</th>
                <th className="p-2 text-center w-14 border border-black">REÇU</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black border border-black">
              {voters.map((item, idx) => (
                <tr key={item.CIN || idx} className="bg-white border-b border-black">
                  <td className="p-2 text-center font-mono font-bold text-black border border-black">{idx + 1}</td>
                  <td className="p-2 font-mono font-bold text-black border border-black whitespace-nowrap">{item.CIN}</td>
                  <td className="p-2 font-bold text-black border border-black max-w-[130px] truncate">{item.PRENOM} {item.NOM}</td>
                  <td className="p-2 text-black border border-black max-w-[100px] truncate">{item.COMMUNE || 'N/C'}</td>
                  <td className="p-2 text-black border border-black max-w-[120px] truncate">{item.LIEU_BUREAU_VOTE || 'N/C'}</td>
                  <td className="p-2 text-center font-extrabold text-black border border-black">
                    {item.has_voted ? 'OK' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-4 pt-2 border-t border-slate-300 flex justify-between items-end text-[11px] text-slate-600">
          <div>
            Signature de l'Encadrant :
            <div className="h-14 w-48 border border-dashed border-slate-400 rounded mt-1"></div>
          </div>
          <div className="text-right font-mono text-[10px]">
            Page 1
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
