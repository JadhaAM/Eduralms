<?php
// Set error reporting for debugging (remove in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Function to sanitize and validate input
function sanitize_input($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

// Only process POST requests
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    try {
        // Get and sanitize form fields
        $name = sanitize_input($_POST["name"] ?? '');
        $email = filter_var($_POST["email"] ?? '', FILTER_SANITIZE_EMAIL);
        $subject = sanitize_input($_POST["subject"] ?? '');
        $phone = sanitize_input($_POST["number"] ?? '');  // Changed from number to phone for clarity
        $message = sanitize_input($_POST["message"] ?? '');

        // Validation
        $errors = [];
        
        if (empty($name)) {
            $errors[] = "Name is required";
        }
        
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = "Valid email is required";
        }
        
        if (empty($subject)) {
            $errors[] = "Subject is required";
        }
        
        if (empty($phone)) {
            $errors[] = "Phone number is required";
        }
        
        if (empty($message)) {
            $errors[] = "Message is required";
        }

        // If there are validation errors, return them
        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $errors
            ]);
            exit;
        }

        // Set the recipient email address
        $recipient = "jadhavamolwork@gmail.com"; // Update this!
        
        // Set the email subject with better formatting
        $email_subject = "New Contact Form Message: $subject";

        // Build the email content with HTML formatting
        $email_content = "
        <html>
        <head>
            <title>New Contact Form Submission</title>
        </head>
        <body>
            <h2>Contact Form Submission Details</h2>
            <p><strong>Name:</strong> $name</p>
            <p><strong>Email:</strong> $email</p>
            <p><strong>Phone:</strong> $phone</p>
            <p><strong>Subject:</strong> $subject</p>
            <p><strong>Message:</strong></p>
            <p>" . nl2br($message) . "</p>
        </body>
        </html>";

        // Email headers
        $headers = array(
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'From: ' . $name . ' <' . $email . '>',
            'Reply-To: ' . $email,
            'X-Mailer: PHP/' . phpversion()
        );

        // Send the email
        if (mail($recipient, $email_subject, $email_content, implode("\r\n", $headers))) {
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Thank you! Your message has been sent successfully.'
            ]);
        } else {
            throw new Exception("Email sending failed");
        }

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Sorry, there was an error sending your message.',
            'error' => $e->getMessage()
        ]);
    }
} else {
    // Not a POST request
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed. Please submit the form properly.'
    ]);
}
?>