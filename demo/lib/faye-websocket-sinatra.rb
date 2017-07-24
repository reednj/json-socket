require 'faye/websocket'

class Faye::WebSocket::Sinatra
	attr_accessor :latency

	def initialize(ws)
		self.latency = nil
		@ws = ws

		@ws.on(:open) { self.on_open }
		@ws.on(:close) { self.on_close }
		@ws.on(:message) { |e|
			packet = JSON.parse(e.data, {:symbolize_names => true})

			if !packet.nil? && !packet[:e].nil?
				Thread.new { self.on_message(packet) }
			end
		 }
	end

	def on_open
		
	end

	def on_close

	end

	def on_message(packet)
		event = packet[:e]
		data = packet[:d]
		event_method = 'on_' + event.underscore
		
		begin
			if self.respond_to? 'before_message'
				before_message(event, data) 
			end

			simulate_latency if !self.latency.nil?
			method(event_method).call(data, packet) if self.respond_to? event_method

			if self.respond_to? 'after_message'
				after_message(event, data)
			end
		rescue => e
			# if the subclass has defined an error handler, then use that if something has
			# happened, otherwise we just rethrow it
			if self.respond_to? 'handle_error'
				handle_error(e, event_method, data)
			else
				raise
			end
		end
	end
	
	# send a message in to the current client
	def send(event, data = {})
		@ws.send({:e => event, :d => data}.to_json)
	end

	def reply(event, id, data)
		packet = {:e => "#{event}:reply", :d => data, :id => id.to_i}
		@ws.send(packet.to_json)
	end
	
	def simulate_latency
		return if self.latency.nil?
		factor = ((rand() * 0.2 - 0.1) + 1) # 0.9 to 1.1
		delay = self.latency * factor
		sleep delay
	end
	
	def close
		@ws.close_connection
	end
end

class Sinatra::Request
	def websocket
		ws = Faye::WebSocket.new(env)
		yield(ws)
		ws.rack_response
	end

	def websocket?
		Faye::WebSocket.websocket?(env)
	end

end

class String
	def underscore
		self.gsub(/::/, '/').
		gsub(/([A-Z]+)([A-Z][a-z])/,'\1_\2').
		gsub(/([a-z\d])([A-Z])/,'\1_\2').
		tr("-", "_").
		downcase
	end
end
