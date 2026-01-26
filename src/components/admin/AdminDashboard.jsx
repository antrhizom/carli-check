import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, functions } from '../../firebase';
import { 
  collection, 
  query, 
  getDocs,
  doc,
  deleteDoc,
  where,
  addDoc,
  updateDoc 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Car, LogOut, Users, Building2, Plus, Trash2, Edit } from 'lucide-react';

const AdminDashboard = () => {
  const { signOut, userData } = useAuth();
  const [activeTab, setActiveTab] = useState('companies');
  const [companies, setCompanies] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [apprentices, setApprentices] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Company Form State
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({
    name: '',
    address: '',
    contact: ''
  });
  const [editingCompany, setEditingCompany] = useState(null);

  // Trainer Form State
  const [showTrainerForm, setShowTrainerForm] = useState(false);
  const [trainerFormData, setTrainerFormData] = useState({
    name: '',
    email: '',
    company: ''
  });

  // Apprentice Form State
  const [showApprenticeForm, setShowApprenticeForm] = useState(false);
  const [apprenticeFormData, setApprenticeFormData] = useState({
    name: '',
    company: '',
    trainer: ''
  });

  // Generated Credentials State
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);

  // Firmen laden
  useEffect(() => {
    const loadCompanies = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, 'companies'));
        const companiesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCompanies(companiesData);
      } catch (error) {
        console.error('Error loading companies:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCompanies();
  }, []);

  // Berufsbildner laden - SOFORT beim Start (für Count in Tabs)
  useEffect(() => {
    const loadTrainers = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'trainer'));
        const snapshot = await getDocs(q);
        const trainersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTrainers(trainersData);
      } catch (error) {
        console.error('Error loading trainers:', error);
      }
    };
    loadTrainers();
  }, []);

  // Lernende laden - SOFORT beim Start (für Count in Tabs)
  useEffect(() => {
    const loadApprentices = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'apprentice'));
        const snapshot = await getDocs(q);
        const apprenticesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setApprentices(apprenticesData);
      } catch (error) {
        console.error('Error loading apprentices:', error);
      }
    };
    loadApprentices();
  }, []);

  // Firma hinzufügen/bearbeiten
  const handleSaveCompany = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingCompany) {
        await updateDoc(doc(db, 'companies', editingCompany), companyFormData);
        setCompanies(prev =>
          prev.map(c => c.id === editingCompany ? { ...c, ...companyFormData } : c)
        );
      } else {
        const docRef = await addDoc(collection(db, 'companies'), companyFormData);
        setCompanies(prev => [...prev, { id: docRef.id, ...companyFormData }]);
      }
      
      setShowCompanyForm(false);
      setCompanyFormData({ name: '', address: '', contact: '' });
      setEditingCompany(null);
      alert('Firma erfolgreich gespeichert!');
    } catch (error) {
      console.error('Error saving company:', error);
      alert('Fehler beim Speichern.');
    } finally {
      setLoading(false);
    }
  };

  // Firma löschen
  const handleDeleteCompany = async (companyId) => {
    if (!confirm('Möchten Sie diese Firma wirklich löschen?')) return;
    
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'companies', companyId));
      setCompanies(prev => prev.filter(c => c.id !== companyId));
      alert('Firma gelöscht!');
    } catch (error) {
      console.error('Error deleting company:', error);
      alert('Fehler beim Löschen.');
    } finally {
      setLoading(false);
    }
  };

  // Berufsbildner hinzufügen
  const handleAddTrainer = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const createTrainer = httpsCallable(functions, 'createTrainer');
      const result = await createTrainer({
        email: trainerFormData.email,
        name: trainerFormData.name,
        company: trainerFormData.company
      });

      if (result.data.success) {
        const newTrainer = {
          id: result.data.uid,
          ...trainerFormData,
          role: 'trainer'
        };
        setTrainers(prev => [...prev, newTrainer]);
        
        // Zeige Credentials Modal
        setGeneratedCredentials({
          type: 'Berufsbildner:in',
          name: trainerFormData.name,
          email: result.data.email,
          password: result.data.password
        });
        setShowCredentialsModal(true);
        
        setShowTrainerForm(false);
        setTrainerFormData({ name: '', email: '', company: '' });
      }
    } catch (error) {
      console.error('Error creating trainer:', error);
      alert('Fehler beim Erstellen des Berufsbildners.');
    } finally {
      setLoading(false);
    }
  };

  // Lernenden hinzufügen
  const handleAddApprentice = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const company = companies.find(c => c.id === apprenticeFormData.company);
      if (!company) {
        alert('Bitte wählen Sie eine gültige Firma aus.');
        return;
      }

      const createApprentice = httpsCallable(functions, 'createApprentice');
      const result = await createApprentice({
        name: apprenticeFormData.name,
        company: apprenticeFormData.company,
        companyName: company.name,
        trainerId: apprenticeFormData.trainer
      });

      if (result.data.success) {
        const newApprentice = {
          id: result.data.uid,
          ...apprenticeFormData,
          companyName: company.name,
          role: 'apprentice',
          email: result.data.email
        };
        setApprentices(prev => [...prev, newApprentice]);
        
        // Zeige Credentials Modal
        setGeneratedCredentials({
          type: 'Lernende:r',
          name: apprenticeFormData.name,
          email: result.data.email,
          password: result.data.password
        });
        setShowCredentialsModal(true);
        
        setShowApprenticeForm(false);
        setApprenticeFormData({ name: '', company: '', trainer: '' });
      }
    } catch (error) {
      console.error('Error creating apprentice:', error);
      alert('Fehler beim Erstellen des Lernenden.');
    } finally {
      setLoading(false);
    }
  };

  // Berufsbildner löschen
  const handleDeleteTrainer = async (trainerId) => {
    if (!confirm('Möchten Sie diesen Berufsbildner wirklich löschen?')) return;
    
    setLoading(true);
    try {
      const deleteTrainer = httpsCallable(functions, 'deleteUser');
      await deleteTrainer({ uid: trainerId });
      
      setTrainers(prev => prev.filter(t => t.id !== trainerId));
      alert('Berufsbildner gelöscht!');
    } catch (error) {
      console.error('Error deleting trainer:', error);
      alert('Fehler beim Löschen.');
    } finally {
      setLoading(false);
    }
  };

  // Lernenden löschen
  const handleDeleteApprentice = async (apprenticeId) => {
    if (!confirm('Möchten Sie diesen Lernenden wirklich löschen?')) return;
    
    setLoading(true);
    try {
      const deleteApprentice = httpsCallable(functions, 'deleteUser');
      await deleteApprentice({ uid: apprenticeId });
      
      setApprentices(prev => prev.filter(a => a.id !== apprenticeId));
      alert('Lernender gelöscht!');
    } catch (error) {
      console.error('Error deleting apprentice:', error);
      alert('Fehler beim Löschen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/logo.svg" 
                alt="carli-check Logo" 
                className="w-10 h-10"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">carli-check</h1>
                <p className="text-sm text-gray-600">
                  Administrator · {userData?.name}
                </p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Abmelden</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('companies')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === 'companies'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4" />
                  <span>Firmen ({companies.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('trainers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === 'trainers'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Berufsbildner:innen ({trainers.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('apprentices')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === 'apprentices'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Lernende ({apprentices.length})</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Firmen Tab */}
        {activeTab === 'companies' && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Firmen verwalten</h2>
              <button
                onClick={() => setShowCompanyForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Firma hinzufügen</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((company) => {
                const companyTrainers = trainers.filter(t => t.company === company.id);
                const companyApprentices = apprentices.filter(a => a.company === company.id);
                
                return (
                  <div key={company.id} className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{company.name}</h3>
                        {company.address && (
                          <p className="text-sm text-gray-600 mt-1">{company.address}</p>
                        )}
                        {company.contact && (
                          <p className="text-sm text-gray-600 mt-1">{company.contact}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{companyTrainers.length}</p>
                        <p className="text-xs text-gray-600">Berufsbildner</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{companyApprentices.length}</p>
                        <p className="text-xs text-gray-600">Lernende</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingCompany(company.id);
                          setCompanyFormData({
                            name: company.name,
                            address: company.address || '',
                            contact: company.contact || ''
                          });
                          setShowCompanyForm(true);
                        }}
                        className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Bearbeiten</span>
                      </button>
                      <button
                        onClick={() => handleDeleteCompany(company.id)}
                        className="flex items-center justify-center px-3 py-2 border border-red-300 rounded-lg text-red-700 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Berufsbildner Tab */}
        {activeTab === 'trainers' && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Berufsbildner verwalten</h2>
              <button
                onClick={() => setShowTrainerForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Berufsbildner hinzufügen</span>
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      E-Mail
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Firma
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lernende
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {trainers.map((trainer) => {
                    const company = companies.find(c => c.id === trainer.company);
                    const trainerApprentices = apprentices.filter(a => a.trainerId === trainer.id);
                    
                    return (
                      <tr key={trainer.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {trainer.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {trainer.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {company?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {trainerApprentices.length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => handleDeleteTrainer(trainer.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lernende Tab */}
        {activeTab === 'apprentices' && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Lernende verwalten</h2>
              <button
                onClick={() => setShowApprenticeForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Lernender hinzufügen</span>
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      E-Mail
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Firma
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Berufsbildner
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {apprentices.map((apprentice) => {
                    const company = companies.find(c => c.id === apprentice.company);
                    const trainer = trainers.find(t => t.id === apprentice.trainerId);
                    
                    return (
                      <tr key={apprentice.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {apprentice.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {apprentice.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {company?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {trainer?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => handleDeleteApprentice(apprentice.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Firma hinzufügen/bearbeiten Modal */}
      {showCompanyForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {editingCompany ? 'Firma bearbeiten' : 'Firma hinzufügen'}
              </h3>
            </div>

            <form onSubmit={handleSaveCompany} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Firmenname *
                </label>
                <input
                  type="text"
                  value={companyFormData.name}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse
                </label>
                <input
                  type="text"
                  value={companyFormData.address}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kontakt
                </label>
                <input
                  type="text"
                  value={companyFormData.contact}
                  onChange={(e) => setCompanyFormData({ ...companyFormData, contact: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tel / E-Mail"
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCompanyForm(false);
                    setCompanyFormData({ name: '', address: '', contact: '' });
                    setEditingCompany(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? 'Speichern...' : 'Speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Berufsbildner hinzufügen Modal */}
      {showTrainerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                Berufsbildner hinzufügen
              </h3>
            </div>

            <form onSubmit={handleAddTrainer} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={trainerFormData.name}
                  onChange={(e) => setTrainerFormData({ ...trainerFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail *
                </label>
                <input
                  type="email"
                  value={trainerFormData.email}
                  onChange={(e) => setTrainerFormData({ ...trainerFormData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Firma *
                </label>
                <select
                  value={trainerFormData.company}
                  onChange={(e) => setTrainerFormData({ ...trainerFormData, company: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Bitte wählen...</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTrainerForm(false);
                    setTrainerFormData({ name: '', email: '', company: '' });
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? 'Erstellen...' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lernender hinzufügen Modal */}
      {showApprenticeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                Lernender hinzufügen
              </h3>
            </div>

            <form onSubmit={handleAddApprentice} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={apprenticeFormData.name}
                  onChange={(e) => setApprenticeFormData({ ...apprenticeFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Firma *
                </label>
                <select
                  value={apprenticeFormData.company}
                  onChange={(e) => {
                    setApprenticeFormData({ ...apprenticeFormData, company: e.target.value, trainer: '' });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Bitte wählen...</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Berufsbildner *
                </label>
                <select
                  value={apprenticeFormData.trainer}
                  onChange={(e) => setApprenticeFormData({ ...apprenticeFormData, trainer: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={!apprenticeFormData.company}
                >
                  <option value="">Bitte wählen...</option>
                  {trainers
                    .filter(t => t.company === apprenticeFormData.company)
                    .map(trainer => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowApprenticeForm(false);
                    setApprenticeFormData({ name: '', company: '', trainer: '' });
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? 'Erstellen...' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {showCredentialsModal && generatedCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {generatedCredentials.type} erfolgreich erstellt!
              </h3>
              <p className="text-gray-600">
                {generatedCredentials.name}
              </p>
            </div>

            <div className="space-y-4 mb-6">
              {/* E-Mail */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail Adresse
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedCredentials.email}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCredentials.email);
                      alert('E-Mail kopiert!');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    title="E-Mail kopieren"
                  >
                    📋
                  </button>
                </div>
              </div>

              {/* Passwort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passwort
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedCredentials.password}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCredentials.password);
                      alert('Passwort kopiert!');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    title="Passwort kopieren"
                  >
                    📋
                  </button>
                </div>
              </div>

              {/* Beide kopieren */}
              <button
                onClick={() => {
                  const text = `E-Mail: ${generatedCredentials.email}\nPasswort: ${generatedCredentials.password}`;
                  navigator.clipboard.writeText(text);
                  alert('Login-Daten kopiert!');
                }}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                📋 Beide kopieren
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Wichtig:</strong> Speichern Sie diese Login-Daten jetzt! Sie werden später nicht mehr angezeigt.
              </p>
            </div>

            <button
              onClick={() => {
                setShowCredentialsModal(false);
                setGeneratedCredentials(null);
              }}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Verstanden
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
