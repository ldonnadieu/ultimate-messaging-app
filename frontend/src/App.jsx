import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css';

const API_URL = 'http://localhost:5000/api';
const socket = io('http://localhost:5000');

function App() {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');

  // Charger les contacts
  useEffect(() => {
    loadContacts();
  }, []);

  // Écouter les nouveaux messages en temps réel
  useEffect(() => {
    socket.on('new_message', (message) => {
      if (message.contactId === selectedContact?._id) {
        setMessages(prev => [...prev, message]);
      }
    });

    return () => socket.off('new_message');
  }, [selectedContact]);

  const loadContacts = async () => {
    try {
      const response = await axios.get(`${API_URL}/contacts`);
      setContacts(response.data);
    } catch (error) {
      console.error('Erreur chargement contacts:', error);
    }
  };

  const loadMessages = async (contact) => {
    try {
      setSelectedContact(contact);
      const response = await axios.get(`${API_URL}/contacts/${contact._id}/messages`);
      setMessages(response.data);
      socket.emit('join_contact', contact._id);
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;

    try {
      await axios.post(`${API_URL}/contacts/${selectedContact._id}/messages`, {
        content: newMessage,
        type: 'outgoing',
        channel: 'app',
        aiGenerated: false
      });
      setNewMessage('');
    } catch (error) {
      console.error('Erreur envoi message:', error);
    }
  };

  const getAISuggestion = async () => {
    if (!selectedContact) return;

    try {
      const response = await axios.post(`${API_URL}/ai/suggest-reply`, {
        message: messages[messages.length - 1]?.content,
        context: 'business'
      });
      setAiSuggestion(response.data.suggestion);
    } catch (error) {
      console.error('Erreur IA:', error);
    }
  };

  const addContact = async () => {
    const name = prompt('Nom du contact:');
    const email = prompt('Email:');
    
    if (name && email) {
      try {
        await axios.post(`${API_URL}/contacts`, {
          name,
          email,
          phone: '',
          company: '',
          tags: ['lead']
        });
        loadContacts();
      } catch (error) {
        console.error('Erreur ajout contact:', error);
      }
    }
  };

  return (
    <div className="app">
      {/* Sidebar Contacts */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Contacts</h2>
          <button onClick={addContact} className="btn-add">+ Nouveau</button>
        </div>
        
        <div className="contacts-list">
          {contacts.map(contact => (
            <div 
              key={contact._id} 
              className={`contact-item ${selectedContact?._id === contact._id ? 'active' : ''}`}
              onClick={() => loadMessages(contact)}
            >
              <div className="contact-avatar">
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <div className="contact-info">
                <div className="contact-name">{contact.name}</div>
                <div className="contact-email">{contact.email}</div>
              </div>
              {contact.leadScore > 0 && (
                <div className="lead-score">{contact.leadScore}%</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Zone de conversation */}
      <div className="chat-area">
        {selectedContact ? (
          <>
            <div className="chat-header">
              <h3>{selectedContact.name}</h3>
              <div className="contact-details">
                {selectedContact.email} • {selectedContact.company}
              </div>
            </div>

            <div className="messages-container">
              {messages.map(message => (
                <div key={message._id} className={`message ${message.type}`}>
                  <div className="message-content">{message.content}</div>
                  <div className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Suggestion IA */}
            {aiSuggestion && (
              <div className="ai-suggestion">
                <div className="suggestion-label">💡 Suggestion IA:</div>
                <div className="suggestion-text">{aiSuggestion}</div>
                <button 
                  onClick={() => {
                    setNewMessage(aiSuggestion);
                    setAiSuggestion('');
                  }}
                  className="btn-use-suggestion"
                >
                  Utiliser
                </button>
              </div>
            )}

            <div className="message-input-area">
              <div className="input-actions">
                <button onClick={getAISuggestion} className="btn-ai">
                  🧠 Aide IA
                </button>
              </div>
              
              <div className="input-group">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Tapez votre message..."
                  className="message-input"
                />
                <button onClick={sendMessage} className="btn-send">
                  Envoyer
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="no-contact-selected">
            <h3>👋 Bienvenue dans votre messagerie business</h3>
            <p>Sélectionnez un contact ou créez-en un nouveau pour commencer</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;