CREATE POLICY "Authenticated can receive realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);