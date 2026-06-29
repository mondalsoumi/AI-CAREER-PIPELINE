export default function NotificationToast({
    title,
    message,
    type = "info",
    onClose,
}) {
    return (
        <div className="fixed top-6 right-6 z-50 animate-pulse">
            <div
                className={`w-96 rounded-xl border bg-white p-5 transition-all duration-300
        ${type === "success"
                        ? "border-green-300"
                        : "border-amber-300"
                    }`}
            >
                <div className="flex justify-between items-start">

                    <div>

                        <h2
                            className={`font-bold text-lg
                ${type === "success"
                                    ? "text-green-700"
                                    : "text-amber-700"
                                }`}
                        >
                            {title}
                        </h2>

                        <p className="text-sm mt-2 text-gray-600 leading-6">
                            {message}
                        </p>

                    </div>

                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 text-lg"
                    >
                        ✕
                    </button>

                </div>
            </div>
        </div>
    );
}