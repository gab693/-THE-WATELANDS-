
import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading
import time
import stripe
from payment_handler import PaymentProcessor

class GameSaveHandler(BaseHTTPRequestHandler):
    SAVE_FILE = "wasteland_save.json"
    
    def __init__(self, *args, **kwargs):
        self.payment_processor = PaymentProcessor()
        super().__init__(*args, **kwargs)
    
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        # Serve static files
        if parsed_path.path == '/':
            self.serve_file('index.html', 'text/html')
        elif parsed_path.path == '/style.css':
            self.serve_file('style.css', 'text/css')
        elif parsed_path.path == '/script.js':
            self.serve_file('script.js', 'text/javascript')
        elif parsed_path.path == '/api/load-progress':
            self.handle_load_progress()
        elif parsed_path.path == '/api/create-payment':
            self.handle_create_payment()
        elif parsed_path.path == '/api/verify-payment':
            self.handle_verify_payment()
        else:
            self.send_error(404)
    
    def do_POST(self):
        if self.path == '/api/save-progress':
            self.handle_save_progress()
        elif self.path == '/api/create-payment':
            self.handle_create_payment()
        elif self.path == '/api/verify-payment':
            self.handle_verify_payment()
        elif self.path == '/api/webhook':
            self.handle_webhook()
        else:
            self.send_error(404)
    
    def do_DELETE(self):
        if self.path == '/api/clear-progress':
            self.handle_clear_progress()
        else:
            self.send_error(404)
    
    def serve_file(self, filename, content_type):
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-type', content_type)
            self.end_headers()
            self.wfile.write(content.encode('utf-8'))
        except FileNotFoundError:
            self.send_error(404)
    
    def handle_save_progress(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            save_data = json.loads(post_data.decode('utf-8'))
            
            # Save to file
            with open(self.SAVE_FILE, 'w') as f:
                json.dump(save_data, f)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
    
    def handle_load_progress(self):
        try:
            if os.path.exists(self.SAVE_FILE):
                with open(self.SAVE_FILE, 'r') as f:
                    save_data = json.load(f)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(save_data).encode('utf-8'))
            else:
                self.send_response(404)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "No save found"}).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
    
    def handle_clear_progress(self):
        try:
            if os.path.exists(self.SAVE_FILE):
                os.remove(self.SAVE_FILE)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "cleared"}).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
    
    def handle_create_payment(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            request_data = json.loads(post_data.decode('utf-8'))
            item_type = request_data.get('item_type')
            player_uid = request_data.get('player_uid')
            
            # Define prices (in cents)
            prices = {
                'starter_pack': 100,  # $1.00
                'premium_bundle': 299,  # $2.99
                'mega_pack': 499  # $4.99
            }
            
            amount = prices.get(item_type, 100)
            
            result = self.payment_processor.create_payment_intent(
                amount_cents=amount,
                metadata={
                    'player_uid': player_uid,
                    'item_type': item_type
                }
            )
            
            self.send_response(200 if result['success'] else 400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode('utf-8'))
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
    
    def handle_verify_payment(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            request_data = json.loads(post_data.decode('utf-8'))
            payment_intent_id = request_data.get('payment_intent_id')
            
            result = self.payment_processor.verify_payment(payment_intent_id)
            
            self.send_response(200 if result['success'] else 400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode('utf-8'))
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
    
    def handle_webhook(self):
        content_length = int(self.headers['Content-Length'])
        payload = self.rfile.read(content_length)
        sig_header = self.headers.get('Stripe-Signature')
        
        try:
            result = self.payment_processor.handle_webhook(payload, sig_header)
            
            self.send_response(200 if result['success'] else 400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode('utf-8'))
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 5000), GameSaveHandler)
    print("🚀 Wasteland server running on http://0.0.0.0:5000")
    print("☢️ Cloud save system active!")
    server.serve_forever()
