
import stripe
import os
from dotenv import load_dotenv
import json

load_dotenv()

# Initialize Stripe with your secret key
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

class PaymentProcessor:
    def __init__(self):
        self.webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
    
    def create_payment_intent(self, amount_cents, currency='usd', metadata=None):
        """Create a payment intent for processing"""
        try:
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency=currency,
                metadata=metadata or {},
                automatic_payment_methods={
                    'enabled': True,
                },
            )
            return {
                'success': True,
                'client_secret': intent.client_secret,
                'payment_intent_id': intent.id
            }
        except stripe.error.StripeError as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def verify_payment(self, payment_intent_id):
        """Verify a payment was successful"""
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            return {
                'success': True,
                'status': intent.status,
                'paid': intent.status == 'succeeded'
            }
        except stripe.error.StripeError as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def handle_webhook(self, payload, sig_header):
        """Handle Stripe webhook events"""
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, self.webhook_secret
            )
            
            if event['type'] == 'payment_intent.succeeded':
                payment_intent = event['data']['object']
                # Handle successful payment
                return self._process_successful_payment(payment_intent)
            
            return {'success': True, 'processed': False}
            
        except (ValueError, stripe.error.SignatureVerificationError) as e:
            return {'success': False, 'error': str(e)}
    
    def _process_successful_payment(self, payment_intent):
        """Process successful payment and grant premium access"""
        metadata = payment_intent.get('metadata', {})
        player_uid = metadata.get('player_uid')
        item_type = metadata.get('item_type')
        
        if player_uid and item_type:
            # Grant premium access to player
            self._grant_premium_access(player_uid, item_type)
            return {
                'success': True,
                'processed': True,
                'player_uid': player_uid,
                'item_type': item_type
            }
        
        return {'success': True, 'processed': False}
    
    def _grant_premium_access(self, player_uid, item_type):
        """Grant premium access to a player"""
        premium_file = f"premium_{player_uid}.json"
        
        try:
            if os.path.exists(premium_file):
                with open(premium_file, 'r') as f:
                    premium_data = json.load(f)
            else:
                premium_data = {'purchases': []}
            
            if item_type not in premium_data['purchases']:
                premium_data['purchases'].append(item_type)
                
                with open(premium_file, 'w') as f:
                    json.dump(premium_data, f)
                    
        except Exception as e:
            print(f"Error granting premium access: {e}")
