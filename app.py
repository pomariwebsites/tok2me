from flask import Flask, render_template, request, jsonify, session, send_from_directory
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import requests
import json
from datetime import datetime
import os

from config import Config
from models import db, User, Chat, Message

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Create tables
with app.app_context():
    db.create_all()

# Serve Service Worker
@app.route('/sw.js')
def service_worker():
    return send_from_directory('static/js', 'sw.js')

# Serve manifest
@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
@login_required
def chat():
    data = request.json
    user_message = data.get('message')
    chat_id = data.get('chat_id')
    
    # Create new chat if needed
    if not chat_id:
        chat = Chat(
            user_id=current_user.id,
            title=user_message[:50] + '...' if len(user_message) > 50 else user_message,
            created_at=datetime.utcnow()
        )
        db.session.add(chat)
        db.session.commit()
        chat_id = chat.id
    
    # Save user message
    user_msg = Message(
        chat_id=chat_id,
        role='user',
        content=user_message,
        timestamp=datetime.utcnow()
    )
    db.session.add(user_msg)
    db.session.commit()
    
    # Get chat history for context
    messages = Message.query.filter_by(chat_id=chat_id).order_by(Message.timestamp).all()
    history = [{"role": msg.role, "content": msg.content} for msg in messages]
    
    # Call DeepSeek API
    headers = {
        "Authorization": f"Bearer {app.config['DEEPSEEK_API_KEY']}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "deepseek-chat",
        "messages": history,
        "stream": True
    }
    
    def generate():
        try:
            response = requests.post(
                app.config['DEEPSEEK_API_URL'],
                headers=headers,
                json=payload,
                stream=True
            )
            
            full_response = ""
            
            for line in response.iter_lines():
                if line:
                    line = line.decode('utf-8')
                    if line.startswith('data: '):
                        data = line[6:]
                        if data != '[DONE]':
                            try:
                                chunk = json.loads(data)
                                if 'choices' in chunk and len(chunk['choices']) > 0:
                                    content = chunk['choices'][0].get('delta', {}).get('content', '')
                                    if content:
                                        full_response += content
                                        yield f"data: {json.dumps({'content': content})}\n\n"
                            except json.JSONDecodeError:
                                continue
            
            # Save assistant message
            if full_response:
                assistant_msg = Message(
                    chat_id=chat_id,
                    role='assistant',
                    content=full_response,
                    timestamp=datetime.utcnow()
                )
                db.session.add(assistant_msg)
                db.session.commit()
                
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        yield "data: [DONE]\n\n"
    
    return app.response_class(generate(), mimetype='text/event-stream')

@app.route('/api/chats', methods=['GET'])
@login_required
def get_chats():
    chats = Chat.query.filter_by(user_id=current_user.id).order_by(Chat.created_at.desc()).all()
    return jsonify([{
        'id': chat.id,
        'title': chat.title,
        'created_at': chat.created_at.isoformat(),
        'message_count': len(chat.messages)
    } for chat in chats])

@app.route('/api/chat/<int:chat_id>', methods=['GET'])
@login_required
def get_chat(chat_id):
    chat = Chat.query.filter_by(id=chat_id, user_id=current_user.id).first_or_404()
    messages = Message.query.filter_by(chat_id=chat_id).order_by(Message.timestamp).all()
    return jsonify([{
        'role': msg.role,
        'content': msg.content,
        'timestamp': msg.timestamp.isoformat()
    } for msg in messages])

@app.route('/api/chat/<int:chat_id>', methods=['DELETE'])
@login_required
def delete_chat(chat_id):
    chat = Chat.query.filter_by(id=chat_id, user_id=current_user.id).first_or_404()
    db.session.delete(chat)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    user = User(
        username=data['username'],
        email=data['email'],
        password_hash=generate_password_hash(data['password'])
    )
    db.session.add(user)
    db.session.commit()
    
    login_user(user)
    return jsonify({'success': True, 'user': user.username})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    
    if user and check_password_hash(user.password_hash, data['password']):
        login_user(user)
        return jsonify({'success': True, 'user': user.username})
    
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'success': True})

@app.route('/api/user', methods=['GET'])
@login_required
def get_user():
    return jsonify({
        'username': current_user.username,
        'email': current_user.email,
        'created_at': current_user.created_at.isoformat()
    })

if __name__ == '__main__':
    app.run(debug=True)
