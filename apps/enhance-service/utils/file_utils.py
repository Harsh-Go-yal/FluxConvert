ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}

def is_allowed_file(filename: str) -> bool:
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
