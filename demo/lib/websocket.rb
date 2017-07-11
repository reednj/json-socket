# A wrapper around the great sinatra-websocket gem (https://github.com/simulacre/sinatra-websocket) that
# allows for event based websockets
#
# Each message to the client should be a json object in the form {'event': string, 'data': obj }
# When received by the server the appropriate method for that event is called, if it exists. For
# example, the event 'setCell' would try to call the method on_set_cell with object contained
# in 'data'. You should subclass WebSocketHelper in order to implement these methods
#
# Nathan Reed (@reednj) 2013-08-21

require 'sinatra-websocket'

class WebSocketHelper
	attr_accessor :latency

	def initialize(ws)
		self.latency = nil
		# the sockets list is the list of all other WebSocketHelper classes
		# for all other connections. This makes it easy to send a message to 
		# all connected clients
		@sockets = SharedList.list
		@ws = ws

		@ws.onopen { self.on_open }
		@ws.onclose { self.on_close }
		@ws.onmessage { |msg|
			packet = JSON.parse(msg, {:symbolize_names => true})
			if !packet.nil? && !packet[:e].nil?
				Thread.new { self.on_message(packet) }
			end
		 }
	end

	def on_open
		@sockets.push self
	end

	def on_close
		@sockets.delete(self)
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
	
	# sends a message to all connected clients, including the current client
	def send_all(event, data)
		EM.next_tick {
			@sockets.each do |s|
				s.send(event, data) 
			end
		}
	end

	# sends a message to all connected clients, *except* the current one
	def send_others(event, data)
		EM.next_tick {
			@sockets.each do |s|
				s.send(event, data) if s != self
			end
		}
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

	#def handle_error(e, path)
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

class SharedList
	@@data = nil
	def self.list
		@@data = [] if @@data == nil
		return @@data
	end
end
